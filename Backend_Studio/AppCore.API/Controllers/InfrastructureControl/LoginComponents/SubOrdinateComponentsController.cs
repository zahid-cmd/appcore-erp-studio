//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InfrastructureControl.LoginComponents;
using AppCore.Application.InfrastructureControl.LoginComponents.SubOrdinateComponents.DTOs;

using AppCore.Domain.Entities.InfrastructureControl.LoginComponents;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.LoginComponents;


//===============================================================
// SubOrdinateComponentsController
//===============================================================

[ApiController]

[Route(
    "api/infrastructure-control/login-components/sub-ordinate-components"
)]

public class SubOrdinateComponentsController
    : ControllerBase
{

    //===========================================================
    // Constants
    //===========================================================

    private const long MaxImageSize =
        2 * 1024 * 1024;


    private static readonly string[] AllowedImageExtensions =
    [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    ];


    private static readonly string[] AllowedImageContentTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];



    //===========================================================
    // Repository
    //===========================================================

    private readonly ISubOrdinateComponentsRepository
        _repository;



    //===========================================================
    // Environment
    //===========================================================

    private readonly IWebHostEnvironment
        _environment;



    //===========================================================
    // Constructor
    //===========================================================

    public SubOrdinateComponentsController
    (
        ISubOrdinateComponentsRepository repository,

        IWebHostEnvironment environment
    )
    {
        _repository =
            repository;

        _environment =
            environment;
    }



    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<IActionResult>
        GetAll()
    {
        var entities =
            await _repository
                .GetAllAsync();


        return Ok(
            entities
        );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<IActionResult>
        GetById
    (
        long id
    )
    {
        if
        (
            id <= 0
        )
        {
            return BadRequest(
                new
                {
                    message =
                        "Invalid Sub Ordinate Component id."
                }
            );
        }


        var entity =
            await _repository
                .GetByIdAsync(
                    id
                );


        if
        (
            entity is null
        )
        {
            return NotFound(
                new
                {
                    message =
                        "Sub Ordinate Component not found."
                }
            );
        }


        return Ok(
            entity
        );
    }



    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    [Consumes(
        "multipart/form-data"
    )]

    [RequestSizeLimit(
        5 * 1024 * 1024
    )]

    public async Task<IActionResult>
        Create
    (
        [FromForm]
        CreateSubOrdinateComponentsDto dto
    )
    {
        //=======================================================
        // Model Validation
        //=======================================================

        // Remarks is optional.
        //
        // Because ASP.NET Core may infer non-nullable string
        // properties as required, explicitly remove Remarks
        // from ModelState validation here.
        //

        ModelState.Remove(
            nameof(
                CreateSubOrdinateComponentsDto.Remarks
            )
        );


        if
        (
            !ModelState.IsValid
        )
        {
            return BadRequest(
                BuildValidationResponse()
            );
        }



        //=======================================================
        // Required Validation
        //=======================================================

        var validationError =
            ValidateRequiredFields(
                dto.Name,
                dto.TabName,
                dto.FolderName,
                dto.FeatureFolder,
                dto.FeatureSubFolder
            );


        if
        (
            validationError is not null
        )
        {
            return BadRequest(
                new
                {
                    message =
                        validationError
                }
            );
        }



        //=======================================================
        // Validate Light Image
        //=======================================================

        var lightImageValidation =
            ValidateImage(
                dto.LightBackgroundImage,
                "Light Background Image"
            );


        if
        (
            lightImageValidation is not null
        )
        {
            return BadRequest(
                new
                {
                    message =
                        lightImageValidation
                }
            );
        }



        //=======================================================
        // Validate Deep Image
        //=======================================================

        var deepImageValidation =
            ValidateImage(
                dto.DeepBackgroundImage,
                "Deep Background Image"
            );


        if
        (
            deepImageValidation is not null
        )
        {
            return BadRequest(
                new
                {
                    message =
                        deepImageValidation
                }
            );
        }



        //=======================================================
        // Build Entity
        //=======================================================

        var entity =
            new SubOrdinateComponents
            {

                //================================================
                // Section 1 - General Information
                //================================================

                Name =
                    dto.Name.Trim(),

                TabName =
                    dto.TabName.Trim(),

                Icon =
                    dto.Icon?.Trim()
                    ?? string.Empty,


                //================================================
                // Section 2 - Component Information
                //================================================

                FolderName =
                    dto.FolderName.Trim(),

                FeatureFolder =
                    dto.FeatureFolder.Trim(),

                FeatureSubFolder =
                    dto.FeatureSubFolder.Trim(),

                ComponentPath =
                    dto.ComponentPath?.Trim()
                    ?? string.Empty,


                //================================================
                // Section 3 - File & Registration Information
                //================================================

                RegistrationFilePath =
                    dto.RegistrationFilePath?.Trim()
                    ?? string.Empty,

                HtmlFilePath =
                    dto.HtmlFilePath?.Trim()
                    ?? string.Empty,

                TsFilePath =
                    dto.TsFilePath?.Trim()
                    ?? string.Empty,

                CssFilePath =
                    dto.CssFilePath?.Trim()
                    ?? string.Empty,


                //================================================
                // Section 4 - Status & Additional Information
                //================================================

                DisplayOrder =
                    dto.DisplayOrder,

                Status =
                    dto.Status,

                Remarks =
                    dto.Remarks?.Trim()
                    ?? string.Empty,


                //================================================
                // Section 5 - Background Image Configuration
                //================================================

                LightBackgroundImagePath =
                    string.Empty,

                DeepBackgroundImagePath =
                    string.Empty
            };



        //=======================================================
        // Create Component
        //=======================================================

        var id =
            await _repository
                .CreateAsync(
                    entity
                );



        //=======================================================
        // Background Image Storage
        //=======================================================

        string lightImagePath =
            string.Empty;

        string deepImagePath =
            string.Empty;


        try
        {
            //===================================================
            // Save Light Image
            //===================================================

            if
            (
                dto.LightBackgroundImage is not null
            )
            {
                lightImagePath =
                    await SaveImageAsync(
                        id,
                        dto.LightBackgroundImage,
                        "light"
                    );
            }



            //===================================================
            // Save Deep Image
            //===================================================

            if
            (
                dto.DeepBackgroundImage is not null
            )
            {
                deepImagePath =
                    await SaveImageAsync(
                        id,
                        dto.DeepBackgroundImage,
                        "deep"
                    );
            }



            //===================================================
            // Save Image Paths Only
            //===================================================

            if
            (
                !string.IsNullOrWhiteSpace(
                    lightImagePath
                )
                ||
                !string.IsNullOrWhiteSpace(
                    deepImagePath
                )
            )
            {
                await _repository
                    .UpdateBackgroundImagePathsAsync(
                        id,
                        lightImagePath,
                        deepImagePath
                    );
            }
        }
        catch
        {
            //===================================================
            // Cleanup Newly Created Images
            //===================================================

            DeletePhysicalImage(
                lightImagePath
            );

            DeletePhysicalImage(
                deepImagePath
            );

            throw;
        }



        //=======================================================
        // Return Created Id
        //=======================================================

        return Ok(
            id
        );
    }



    //===========================================================
    // Update
    //===========================================================

    [HttpPut("{id:long}")]

    [Consumes(
        "multipart/form-data"
    )]

    [RequestSizeLimit(
        5 * 1024 * 1024
    )]

    public async Task<IActionResult>
        Update
    (
        long id,

        [FromForm]
        UpdateSubOrdinateComponentsDto dto
    )
    {
        //=======================================================
        // Route Id Validation
        //=======================================================

        if
        (
            id <= 0
        )
        {
            return BadRequest(
                new
                {
                    message =
                        "Invalid Sub Ordinate Component id."
                }
            );
        }



        //=======================================================
        // Model Validation
        //=======================================================

        // Remarks is optional.

        ModelState.Remove(
            nameof(
                UpdateSubOrdinateComponentsDto.Remarks
            )
        );


        if
        (
            !ModelState.IsValid
        )
        {
            return BadRequest(
                BuildValidationResponse()
            );
        }



        //=======================================================
        // Route Id Is Authoritative
        //=======================================================

        dto.Id =
            id;



        //=======================================================
        // Required Validation
        //=======================================================

        var validationError =
            ValidateRequiredFields(
                dto.Name,
                dto.TabName,
                dto.FolderName,
                dto.FeatureFolder,
                dto.FeatureSubFolder
            );


        if
        (
            validationError is not null
        )
        {
            return BadRequest(
                new
                {
                    message =
                        validationError
                }
            );
        }



        //=======================================================
        // Validate Light Image
        //=======================================================

        var lightImageValidation =
            ValidateImage(
                dto.LightBackgroundImage,
                "Light Background Image"
            );


        if
        (
            lightImageValidation is not null
        )
        {
            return BadRequest(
                new
                {
                    message =
                        lightImageValidation
                }
            );
        }



        //=======================================================
        // Validate Deep Image
        //=======================================================

        var deepImageValidation =
            ValidateImage(
                dto.DeepBackgroundImage,
                "Deep Background Image"
            );


        if
        (
            deepImageValidation is not null
        )
        {
            return BadRequest(
                new
                {
                    message =
                        deepImageValidation
                }
            );
        }



        //=======================================================
        // Load Existing Entity
        //=======================================================

        var entity =
            await _repository
                .GetByIdAsync(
                    id
                );


        if
        (
            entity is null
        )
        {
            return NotFound(
                new
                {
                    message =
                        "Sub Ordinate Component not found."
                }
            );
        }



        //=======================================================
        // Keep Existing Image Paths
        //=======================================================

        string oldLightImagePath =
            entity.LightBackgroundImagePath;


        string oldDeepImagePath =
            entity.DeepBackgroundImagePath;


        string newLightImagePath =
            oldLightImagePath;


        string newDeepImagePath =
            oldDeepImagePath;



        //=======================================================
        // Section 1 - General Information
        //=======================================================

        entity.Name =
            dto.Name.Trim();


        entity.TabName =
            dto.TabName.Trim();


        entity.Icon =
            dto.Icon?.Trim()
            ?? string.Empty;



        //=======================================================
        // Section 2 - Component Information
        //=======================================================

        entity.FolderName =
            dto.FolderName.Trim();


        entity.FeatureFolder =
            dto.FeatureFolder.Trim();


        entity.FeatureSubFolder =
            dto.FeatureSubFolder.Trim();


        entity.ComponentPath =
            dto.ComponentPath?.Trim()
            ?? string.Empty;



        //=======================================================
        // Section 3 - File & Registration Information
        //=======================================================

        entity.RegistrationFilePath =
            dto.RegistrationFilePath?.Trim()
            ?? string.Empty;


        entity.HtmlFilePath =
            dto.HtmlFilePath?.Trim()
            ?? string.Empty;


        entity.TsFilePath =
            dto.TsFilePath?.Trim()
            ?? string.Empty;


        entity.CssFilePath =
            dto.CssFilePath?.Trim()
            ?? string.Empty;



        //=======================================================
        // Section 4 - Status & Additional Information
        //=======================================================

        entity.DisplayOrder =
            dto.DisplayOrder;


        entity.Status =
            dto.Status;


        entity.Remarks =
            dto.Remarks?.Trim()
            ?? string.Empty;



        //=======================================================
        // New Image Tracking
        //=======================================================

        bool newLightImageSaved =
            false;


        bool newDeepImageSaved =
            false;



        try
        {
            //===================================================
            // Section 5 - Light Background Image
            //===================================================

            if
            (
                dto.LightBackgroundImage is not null
            )
            {
                newLightImagePath =
                    await SaveImageAsync(
                        id,
                        dto.LightBackgroundImage,
                        "light"
                    );

                newLightImageSaved =
                    true;
            }
            else if
            (
                dto.RemoveLightBackgroundImage
            )
            {
                newLightImagePath =
                    string.Empty;
            }



            //===================================================
            // Section 6 - Deep Background Image
            //===================================================

            if
            (
                dto.DeepBackgroundImage is not null
            )
            {
                newDeepImagePath =
                    await SaveImageAsync(
                        id,
                        dto.DeepBackgroundImage,
                        "deep"
                    );

                newDeepImageSaved =
                    true;
            }
            else if
            (
                dto.RemoveDeepBackgroundImage
            )
            {
                newDeepImagePath =
                    string.Empty;
            }



            //===================================================
            // Apply Image Paths
            //===================================================

            entity.LightBackgroundImagePath =
                newLightImagePath;


            entity.DeepBackgroundImagePath =
                newDeepImagePath;



            //===================================================
            // Repository Update
            //===================================================

            await _repository
                .UpdateAsync(
                    entity
                );
        }
        catch
        {
            //===================================================
            // Cleanup Newly Uploaded Light Image
            //===================================================

            if
            (
                newLightImageSaved
                &&
                newLightImagePath !=
                    oldLightImagePath
            )
            {
                DeletePhysicalImage(
                    newLightImagePath
                );
            }



            //===================================================
            // Cleanup Newly Uploaded Deep Image
            //===================================================

            if
            (
                newDeepImageSaved
                &&
                newDeepImagePath !=
                    oldDeepImagePath
            )
            {
                DeletePhysicalImage(
                    newDeepImagePath
                );
            }


            throw;
        }



        //=======================================================
        // Delete Previous Light Image
        //=======================================================

        if
        (
            !string.IsNullOrWhiteSpace(
                oldLightImagePath
            )
            &&
            oldLightImagePath !=
                newLightImagePath
        )
        {
            DeletePhysicalImage(
                oldLightImagePath
            );
        }



        //=======================================================
        // Delete Previous Deep Image
        //=======================================================

        if
        (
            !string.IsNullOrWhiteSpace(
                oldDeepImagePath
            )
            &&
            oldDeepImagePath !=
                newDeepImagePath
        )
        {
            DeletePhysicalImage(
                oldDeepImagePath
            );
        }



        //=======================================================
        // Success
        //=======================================================

        return NoContent();
    }



    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult>
        Delete
    (
        long id
    )
    {
        if
        (
            id <= 0
        )
        {
            return BadRequest(
                new
                {
                    message =
                        "Invalid Sub Ordinate Component id."
                }
            );
        }


        var entity =
            await _repository
                .GetByIdAsync(
                    id
                );


        if
        (
            entity is null
        )
        {
            return NotFound(
                new
                {
                    message =
                        "Sub Ordinate Component not found."
                }
            );
        }


        await _repository
            .DeleteAsync(
                id
            );


        //=======================================================
        // IMPORTANT
        //=======================================================
        //
        // Physical images are intentionally NOT deleted here.
        //
        // Delete is a soft-delete operation and the record can
        // later be restored. Keeping the images preserves the
        // component's image configuration during restoration.
        //

        return NoContent();
    }



    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult>
        Restore()
    {
        try
        {
            await _repository
                .RestoreAsync();


            return NoContent();
        }
        catch
        (
            InvalidOperationException
        )
        {
            return NotFound(
                new
                {
                    message =
                        "There is no deleted Sub Ordinate Component to restore."
                }
            );
        }
    }



    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<IActionResult>
        GetHistory()
    {
        var history =
            await _repository
                .GetHistoryAsync();


        return Ok(
            history
        );
    }



    //===========================================================
    // Get Entity History
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task<IActionResult>
        GetEntityHistory
    (
        long id
    )
    {
        if
        (
            id <= 0
        )
        {
            return BadRequest(
                new
                {
                    message =
                        "Invalid Sub Ordinate Component id."
                }
            );
        }


        var history =
            await _repository
                .GetEntityHistoryAsync(
                    id
                );


        return Ok(
            history
        );
    }



    //===========================================================
    // Validate Required Fields
    //===========================================================

    private string?
        ValidateRequiredFields
    (
        string?
        name,

        string?
        tabName,

        string?
        folderName,

        string?
        featureFolder,

        string?
        featureSubFolder
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                name
            )
        )
        {
            return "Name is required.";
        }


        if
        (
            string.IsNullOrWhiteSpace(
                tabName
            )
        )
        {
            return "Tab Name is required.";
        }


        if
        (
            string.IsNullOrWhiteSpace(
                folderName
            )
        )
        {
            return "Folder Name is required.";
        }


        if
        (
            string.IsNullOrWhiteSpace(
                featureFolder
            )
        )
        {
            return "Feature Folder is required.";
        }


        if
        (
            string.IsNullOrWhiteSpace(
                featureSubFolder
            )
        )
        {
            return "Feature Sub Folder is required.";
        }


        return null;
    }



    //===========================================================
    // Validate Image
    //===========================================================

    private string?
        ValidateImage
    (
        IFormFile?
        file,

        string
        fieldName
    )
    {
        //=======================================================
        // No File
        //=======================================================

        if
        (
            file is null
        )
        {
            return null;
        }



        //=======================================================
        // Empty File
        //=======================================================

        if
        (
            file.Length <= 0
        )
        {
            return
                $"{fieldName} cannot be empty.";
        }



        //=======================================================
        // Maximum File Size
        //=======================================================

        if
        (
            file.Length >
                MaxImageSize
        )
        {
            return
                $"{fieldName} must not exceed 2 MB.";
        }



        //=======================================================
        // Extension
        //=======================================================

        string extension =
            Path.GetExtension(
                file.FileName
            )
            .ToLowerInvariant();


        if
        (
            !AllowedImageExtensions
                .Contains(
                    extension
                )
        )
        {
            return
                $"{fieldName} must be JPG, JPEG, PNG or WEBP.";
        }



        //=======================================================
        // Content Type
        //=======================================================

        string contentType =
            file.ContentType
                ?.ToLowerInvariant()
                ?? string.Empty;


        if
        (
            !AllowedImageContentTypes
                .Contains(
                    contentType
                )
        )
        {
            return
                $"{fieldName} has an invalid image type.";
        }


        return null;
    }



    //===========================================================
    // Save Image
    //===========================================================

    private async Task<string>
        SaveImageAsync
    (
        long id,

        IFormFile file,

        string theme
    )
    {
        //=======================================================
        // Web Root
        //=======================================================

        string webRootPath =
            _environment.WebRootPath;


        if
        (
            string.IsNullOrWhiteSpace(
                webRootPath
            )
        )
        {
            webRootPath =
                Path.Combine(
                    _environment.ContentRootPath,
                    "wwwroot"
                );
        }



        //=======================================================
        // Upload Directory
        //=======================================================

        string uploadDirectory =
            Path.Combine(
                webRootPath,
                "uploads",
                "sub-ordinate-components",
                id.ToString()
            );


        //=======================================================
        // Create Directory
        //=======================================================

        Directory.CreateDirectory(
            uploadDirectory
        );



        //=======================================================
        // Extension
        //=======================================================

        string extension =
            Path.GetExtension(
                file.FileName
            )
            .ToLowerInvariant();



        //=======================================================
        // Unique File Name
        //=======================================================

        string fileName =
            $"{theme}-{Guid.NewGuid():N}{extension}";



        //=======================================================
        // Physical File Path
        //=======================================================

        string physicalFilePath =
            Path.Combine(
                uploadDirectory,
                fileName
            );



        //=======================================================
        // Save File
        //=======================================================

        await using
        (
            FileStream stream =
                new FileStream(
                    physicalFilePath,
                    FileMode.Create,
                    FileAccess.Write,
                    FileShare.None
                )
        )
        {
            await file.CopyToAsync(
                stream
            );
        }



        //=======================================================
        // Database Relative Path
        //=======================================================

        return
            $"/uploads/sub-ordinate-components/{id}/{fileName}";
    }



    //===========================================================
    // Delete Physical Image
    //===========================================================

    private void
        DeletePhysicalImage
    (
        string?
        relativePath
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                relativePath
            )
        )
        {
            return;
        }



        //=======================================================
        // Normalize Path
        //=======================================================

        string normalizedPath =
            relativePath
                .Trim()
                .TrimStart(
                    '/',
                    '\\'
                )
                .Replace(
                    '/',
                    Path.DirectorySeparatorChar
                )
                .Replace(
                    '\\',
                    Path.DirectorySeparatorChar
                );



        //=======================================================
        // Security Check
        //=======================================================

        if
        (
            normalizedPath
                .Contains(
                    ".."
                )
        )
        {
            return;
        }



        //=======================================================
        // Web Root
        //=======================================================

        string webRootPath =
            _environment.WebRootPath;


        if
        (
            string.IsNullOrWhiteSpace(
                webRootPath
            )
        )
        {
            webRootPath =
                Path.Combine(
                    _environment.ContentRootPath,
                    "wwwroot"
                );
        }



        //=======================================================
        // Physical Path
        //=======================================================

        string physicalFilePath =
            Path.Combine(
                webRootPath,
                normalizedPath
            );



        //=======================================================
        // Delete
        //=======================================================

        if
        (
            System.IO.File.Exists(
                physicalFilePath
            )
        )
        {
            System.IO.File.Delete(
                physicalFilePath
            );
        }
    }



    //===========================================================
    // Build Validation Response
    //===========================================================

    private object
        BuildValidationResponse()
    {
        var errors =
            ModelState
                .Where(
                    item =>
                        item.Value != null
                        &&
                        item.Value.Errors.Count > 0
                )
                .ToDictionary(
                    item =>
                        item.Key,

                    item =>
                        item.Value!
                            .Errors
                            .Select(
                                error =>
                                    string.IsNullOrWhiteSpace(
                                        error.ErrorMessage
                                    )
                                        ? error.Exception?.Message
                                            ?? "Invalid value."
                                        : error.ErrorMessage
                            )
                            .ToArray()
                );


        return new
        {
            message =
                "One or more validation errors occurred.",

            errors
        };
    }

}