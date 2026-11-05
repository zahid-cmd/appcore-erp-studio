//===============================================================
// Namespaces
//===============================================================

using System.Collections.Concurrent;
using System.Linq;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.Public.Website;

using AppCore.Api.Security;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Public;


//===============================================================
// Public Website Controller
//---------------------------------------------------------------
// GET api/public/website : the data the company's public
// website shows (company, branches, bike models with colours,
// images, MRP and a stock badge). Anonymous and read-only;
// display fields only (see PublicWebsiteDto).
//
// Enquire form :
//   GET  api/public/website/enquiry-options  areas + showrooms
//   POST api/public/website/enquiry          a sales enquiry
//   GET  api/public/website/service-slots    free service times
//   GET  api/public/website/test-ride-slots  free test ride times
//   POST api/public/website/service-enquiry  book a service /
//                                            ask for a part
//   Spam checks on POST : 5 per hour from one address, a hidden
//   field that must stay empty, and at least 3 seconds spent on
//   the form. A bot gets a normal-looking "thank you" and
//   nothing is saved.
//===============================================================

[ApiController]

[AllowAnonymous]

[Route("api/public/website")]

public class PublicWebsiteController : ControllerBase
{
    private readonly IPublicWebsiteRepository _repository;

    private readonly ISalesEnquiriesRepository _enquiries;

    private readonly IServiceEnquiriesRepository _serviceEnquiries;

    private readonly ILogger<PublicWebsiteController> _logger;


    // Enquire form : sends per address in the last hour
    // Default hourly limit : now the switch CFG-MOD-010-0041
    private const int EnquiryLimitPerHour = 5;

    private const int MinimumFillMs = 3000;

    private static readonly ConcurrentDictionary<string, List<DateTime>> EnquirySends =
        new();


    public PublicWebsiteController(
        IPublicWebsiteRepository repository,
        ISalesEnquiriesRepository enquiries,
        IServiceEnquiriesRepository serviceEnquiries,
        ILogger<PublicWebsiteController> logger)
    {
        _repository = repository;

        _enquiries = enquiries;

        _serviceEnquiries = serviceEnquiries;

        _logger = logger;
    }


    [HttpGet]

    // Never cached : a Website Configuration Update shows at once
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]

    public async Task<ActionResult<PublicWebsiteDto>> Get()
    {
        return Ok(await _repository.GetAsync());
    }


    // GET api/public/website/parts?brand=BRAND-001 : that brand's
    // spare parts, lubricants and accessories (MRP, availability)
    [HttpGet("parts")]

    [ResponseCache(Duration = 120, Location = ResponseCacheLocation.Any)]

    public async Task<ActionResult<List<PublicPartDto>>> GetParts(
        [FromQuery] string brand)
    {
        if (string.IsNullOrWhiteSpace(brand) || brand.Length > 30)
        {
            return Ok(new List<PublicPartDto>());
        }

        return Ok(await _repository.GetPartsAsync(brand));
    }


    //===========================================================
    // Enquire form : areas and showrooms
    //===========================================================

    [HttpGet("enquiry-options")]

    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]

    public async Task<ActionResult<PublicEnquiryOptionsDto>> GetEnquiryOptions()
    {
        return Ok(await _enquiries.GetWebsiteOptionsAsync());
    }


    // GET api/public/website/test-ride-slots?date=2026-11-10&branch=BR-001
    // : that showroom's free test ride times of the day (Configured
    // false = no Test Ride time slot : Morning / Afternoon / Evening)
    [HttpGet("test-ride-slots")]

    public async Task<ActionResult<PublicRideSlotsDto>> GetTestRideSlots(
        [FromQuery] DateOnly date,
        [FromQuery] string? branch)
    {
        // No branch : only whether a Test Ride time slot is set up
        if (branch != null && branch.Length > 30)
        {
            return Ok(new PublicRideSlotsDto());
        }

        return Ok(await _enquiries.GetWebsiteRideSlotsAsync(date, branch));
    }


    // GET api/public/website/service-slots?date=2026-11-10&branch=BR-001
    // : that service centre's free appointment times of the day
    // (no cache : places fill up)
    [HttpGet("service-slots")]

    public async Task<ActionResult<List<PublicServiceSlotDto>>> GetServiceSlots(
        [FromQuery] DateOnly date,
        [FromQuery] string? branch)
    {
        if (string.IsNullOrWhiteSpace(branch) || branch.Length > 30)
        {
            return Ok(new List<PublicServiceSlotDto>());
        }

        return Ok(await _serviceEnquiries.GetWebsiteSlotsAsync(date, branch));
    }


    //===========================================================
    // Enquire form : send
    //===========================================================

    [HttpPost("enquiry")]

    public async Task<ActionResult<PublicEnquiryResultDto>> PostEnquiry(
        [FromBody] PublicEnquiryRequestDto? dto)
    {
        if (dto == null)
        {
            return BadRequest(new { message = "Fill in the form, please." });
        }

        // Bots : the hidden field is filled or the form was sent
        // at once. They see a thank-you; nothing is saved.
        if (!string.IsNullOrWhiteSpace(dto.Website) || dto.FilledMs < MinimumFillMs)
        {
            _logger.LogWarning("Website enquiry ignored as spam from {Address}.", ClientAddress());

            return Ok(new PublicEnquiryResultDto
            {
                Message = "Thank you! Our executive will call you soon."
            });
        }

        if (!TakeEnquirySlot(ClientAddress(), await _enquiries.WebsiteSendsPerHourAsync()))
        {
            return StatusCode(
                StatusCodes.Status429TooManyRequests,
                new { message = "Too many requests. Please try again later, or call us." });
        }

        try
        {
            return Ok(await _enquiries.CreateFromWebsiteAsync(dto));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Website enquiry failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "Sorry, your enquiry could not be sent. Please call us." });
        }
    }


    //===========================================================
    // Book a service / Ask for a part : send (same spam checks
    // and hourly limit as the Enquire form)
    //===========================================================

    [HttpPost("service-enquiry")]

    public async Task<ActionResult<PublicEnquiryResultDto>> PostServiceEnquiry(
        [FromBody] PublicServiceEnquiryRequestDto? dto)
    {
        if (dto == null)
        {
            return BadRequest(new { message = "Fill in the form, please." });
        }

        if (!string.IsNullOrWhiteSpace(dto.Website) || dto.FilledMs < MinimumFillMs)
        {
            _logger.LogWarning("Website service enquiry ignored as spam from {Address}.", ClientAddress());

            return Ok(new PublicEnquiryResultDto
            {
                Message = "Thank you! We will call you soon."
            });
        }

        if (!TakeEnquirySlot(ClientAddress(), await _enquiries.WebsiteSendsPerHourAsync()))
        {
            return StatusCode(
                StatusCodes.Status429TooManyRequests,
                new { message = "Too many requests. Please try again later, or call us." });
        }

        try
        {
            return Ok(await _serviceEnquiries.CreateFromWebsiteAsync(dto));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Website service enquiry failed.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "Sorry, your request could not be sent. Please call us." });
        }
    }


    // Real visitor IP. X-Forwarded-For is applied only when it comes
    // from a trusted proxy (UseForwardedHeaders in Program.cs); a
    // header sent by the visitor directly is ignored, so it can no
    // longer be faked to get round the hourly limit.
    private string ClientAddress()
    {
        return ApiSecurity.ClientIp(HttpContext);
    }


    // One send from this address, if under the hourly limit
    // (switch CFG-MOD-010-0041; null = no hourly limit)
    private static bool TakeEnquirySlot(string address, int? limit)
    {
        DateTime now =
            DateTime.UtcNow;

        List<DateTime> sends =
            EnquirySends.GetOrAdd(address, _ => new List<DateTime>());

        lock (sends)
        {
            sends.RemoveAll(x => x < now.AddHours(-1));

            if (limit.HasValue && sends.Count >= limit.Value)
            {
                return false;
            }

            sends.Add(now);
        }

        // Old addresses do not pile up
        if (EnquirySends.Count > 5000)
        {
            foreach (var pair in EnquirySends)
            {
                lock (pair.Value)
                {
                    if (pair.Value.All(x => x < now.AddHours(-1)))
                    {
                        EnquirySends.TryRemove(pair.Key, out _);
                    }
                }
            }
        }

        return true;
    }
}
