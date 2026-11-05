/*===============================================================
  Website Configuration : Moto Zone starter content

  Fills Website Configuration with suggested wording for Moto
  Zone. ONE statement (pgAdmin-friendly). Run AFTER WebsiteConfiguration_Tables.sql and
  WebsiteConfiguration_Texts.sql, in a fresh Query Tool.

  REPLACES : the configuration row, opening hours, the lists
  (moving strip, why us, service cards, FAQ, payment methods,
  section texts) and the Warranty / Terms / Privacy pages.
  KEEPS    : Brands, brands per branch and brand warranty parts.

  ASSUMED (check on the page and correct) :
    - WhatsApp 8801312890087 (the hotline on the website today)
    - Hours : Saturday - Thursday 10:00-20:00, Friday 15:00-20:00
    - Map   : "Moto Zone, Uttara, Dhaka"
    - No offer, no social links, no "why us" numbers (add real
      ones on the page; nothing is invented)
===============================================================*/

DO $$
BEGIN

DELETE FROM public."WebsitePolicySections"
WHERE "WebsitePolicyId" IN (SELECT "WebsitePolicyId" FROM public."WebsitePolicies" WHERE "BrandManagementId" = 0);

DELETE FROM public."WebsitePolicies" WHERE "BrandManagementId" = 0;

DELETE FROM public."WebsiteContentItems";

DELETE FROM public."WebsiteOpeningHours";

DELETE FROM public."WebsiteConfigurations";


INSERT INTO public."WebsiteConfigurations"
(
    "IsEnabled", "DefaultTheme", "Template", "CurrencySymbol",
    "Tagline", "About",
    "Hotline", "WhatsApp", "Email", "MapQuery",
    "FacebookUrl", "YoutubeUrl", "InstagramUrl", "TiktokUrl",
    "ShowBrandsMenu", "ShowOfferRibbon", "ShowMovingStrip", "ShowWhyUs",
    "ShowEmi", "ShowService", "ShowBranches", "ShowFaq",
    "WhyPhotoPath",
    "EmiExamplePrice", "EmiDownPercents", "EmiMonths", "EmiNote",
    "OfferTitle", "OfferText", "OfferEndsOn",
    "CreatedBy", "CreatedDate"
)
VALUES
(
    true, 'deep', 'website-page-1', '',
    'Smart electric rides for every road in Dhaka',
    'Moto Zone is an authorised dealer of Yadea and Revoo electric motorcycles, with sales, genuine parts and expert service under one roof. Visit our showroom for a test ride, easy EMI and registration support.',
    '', '8801312890087', '', 'Moto Zone, Uttara, Dhaka',
    '', '', '', '',
    true, false, true, true,
    true, true, true, true,
    '',
    0, '10,20,30,50', '3,6,12,18,24',
    'Estimate only. The final instalment depends on the bank, the card, processing fees and approval.',
    '', '', NULL,
    1, now()
);


INSERT INTO public."WebsiteOpeningHours" ("Days", "OpensAt", "ClosesAt", "IsClosed", "DisplayOrder")
VALUES
    ('Saturday - Thursday', '10:00', '20:00', false, 1),
    ('Friday',              '15:00', '20:00', false, 2);


INSERT INTO public."WebsiteContentItems" ("Kind", "Title", "Text", "PhotoPath", "DisplayOrder")
VALUES
    ('tag', 'Authorised dealer', '', '', 1),
    ('tag', 'Genuine parts', '', '', 2),
    ('tag', 'Expert service', '', '', 3),
    ('tag', 'Easy EMI', '', '', 4),
    ('tag', 'Registration support', '', '', 5),
    ('tag', 'Free test rides', '', '', 6),
    ('why-point', 'Authorised dealer', 'Genuine bikes with the brand''s full warranty and papers you can trust.', '', 1),
    ('why-point', 'Easy payment', 'Cash, cards, mobile banking and EMI plans to suit your budget.', '', 2),
    ('why-point', 'Service you can rely on', 'Trained mechanics and genuine spare parts at our service centre.', '', 3),
    ('why-point', 'Paperwork made simple', 'We help with registration, number plates and documents.', '', 4),
    ('service', 'Regular servicing', 'Scheduled check-ups by trained mechanics keep your bike safe and smooth.', '', 1),
    ('service', 'Genuine spare parts', 'Original parts for every model we sell, in stock or ordered for you.', '', 2),
    ('service', 'Battery & charging care', 'Battery health checks and charging advice for electric bikes.', '', 3),
    ('service', 'Accessories', 'Helmets, covers, locks and more to complete your ride.', '', 4),
    ('faq', 'Can I buy on EMI?', 'Yes. We offer bank card EMI and company instalment plans. Use the EMI calculator for an estimate, then talk to us for the plan that suits you.', '', 1),
    ('faq', 'Do you help with registration?', 'Yes. Our team helps with BRTA registration, number plates and the paperwork after you buy.', '', 2),
    ('faq', 'Can I take a test ride?', 'Yes, test rides are free. Book one on WhatsApp or visit the showroom with your driving licence.', '', 3),
    ('faq', 'What warranty do the bikes have?', 'Every bike comes with the manufacturer''s warranty. The Warranty page and your warranty card explain what is covered and for how long.', '', 4),
    ('faq', 'Where can I service my bike?', 'At our service centre, with trained mechanics and genuine parts. Call or WhatsApp us to book a slot.', '', 5),
    ('faq', 'How do I charge an electric bike?', 'From a normal home socket with the charger that comes with the bike. We explain charging and battery care at delivery.', '', 6),
    ('payment', 'Cash', '', '', 1),
    ('payment', 'bKash', '', '', 2),
    ('payment', 'Nagad', '', '', 3),
    ('payment', 'Visa', '', '', 4),
    ('payment', 'Mastercard', '', '', 5),
    ('payment', 'Bank transfer', '', '', 6);


-- Section texts (Texts & Offer tab). Title = key, Text = wording.
INSERT INTO public."WebsiteContentItems" ("Kind", "Title", "Text", "PhotoPath", "DisplayOrder")
VALUES
    ('text', 'bikes.kicker', 'Our bikes', '', 1),
    ('text', 'bikes.title', 'Find your ride', '', 2),
    ('text', 'why.kicker', 'Why buy from us', '', 3),
    ('text', 'why.title', 'More than a bike shop', '', 4),
    ('text', 'emi.kicker', 'Easy payment', '', 5),
    ('text', 'emi.title', 'Ride now, pay monthly', '', 6),
    ('text', 'emi.lead', 'Bank card EMI and company instalments. Pick a down payment and months to see an estimate.', '', 7),
    ('text', 'service.kicker', 'After you buy', '', 8),
    ('text', 'service.title', 'Service, parts & care', '', 9),
    ('text', 'branches.kicker', 'Visit us', '', 10),
    ('text', 'branches.title', 'Our branches', '', 11),
    ('text', 'faq.kicker', 'Any questions?', '', 12),
    ('text', 'faq.title', 'Before you buy', '', 13),
    ('text', 'faq.lead', 'Still not sure? Message us and a sales adviser will reply.', '', 14),
    ('text', 'ride.title', 'Feel it before you buy it', '', 15),
    ('text', 'ride.text', 'Book a free test ride at your nearest branch. Bring your driving licence; we''ll handle the rest.', '', 16),
    ('text', 'visit.kicker', 'Visit us', '', 17),
    ('text', 'visit.title', 'Opening hours & location', '', 18),
    ('text', 'prices.note', 'MRP includes VAT. Prices can change without notice; please confirm at the branch.', '', 19);


WITH p AS
(
    INSERT INTO public."WebsitePolicies" ("PolicyKey", "BrandManagementId", "Title", "UpdatedOn")
    VALUES ('warranty', 0, 'Warranty', CURRENT_DATE)
    RETURNING "WebsitePolicyId"
)
INSERT INTO public."WebsitePolicySections" ("WebsitePolicyId", "Heading", "Text", "DisplayOrder")
SELECT p."WebsitePolicyId", s.heading, s.body, s.ord
FROM p,
(
    VALUES
    ('Manufacturer''s warranty', 'Every new bike sold by Moto Zone carries the manufacturer''s warranty. The period and the parts covered are written on the warranty card you receive at delivery.', 1),
    ('What is not covered', 'Normal wear and tear (tyres, brake pads, bulbs), damage from accidents, misuse, flooding or unauthorised repairs, and bikes used for racing or hire are not covered.', 2),
    ('How to claim', 'Bring the bike, the warranty card and your purchase invoice to our service centre. We check the problem and arrange the repair or replacement with the manufacturer.', 3),
    ('Keep your warranty valid', 'Service the bike on schedule at an authorised service centre, use genuine parts and the original charger, and keep your service records.', 4)
) AS s (heading, body, ord);


WITH p AS
(
    INSERT INTO public."WebsitePolicies" ("PolicyKey", "BrandManagementId", "Title", "UpdatedOn")
    VALUES ('terms', 0, 'Terms', CURRENT_DATE)
    RETURNING "WebsitePolicyId"
)
INSERT INTO public."WebsitePolicySections" ("WebsitePolicyId", "Heading", "Text", "DisplayOrder")
SELECT p."WebsitePolicyId", s.heading, s.body, s.ord
FROM p,
(
    VALUES
    ('Prices and availability', 'Prices on this website are MRP and include VAT. They can change without notice, and stock depends on the branch. Please confirm the price and availability before you pay.', 1),
    ('Booking and delivery', 'A booking is confirmed once we receive the booking amount and give you a receipt. Delivery dates depend on stock and on registration.', 2),
    ('Payments and EMI', 'We accept cash, cards, mobile banking and bank transfer. EMI depends on the bank''s or our approval and its own terms and charges.', 3),
    ('Registration', 'Registration fees and taxes are set by BRTA and are paid in addition to the bike price unless stated otherwise.', 4),
    ('Changes to these terms', 'We may update these terms. The date at the top shows the latest version.', 5)
) AS s (heading, body, ord);


WITH p AS
(
    INSERT INTO public."WebsitePolicies" ("PolicyKey", "BrandManagementId", "Title", "UpdatedOn")
    VALUES ('privacy', 0, 'Privacy', CURRENT_DATE)
    RETURNING "WebsitePolicyId"
)
INSERT INTO public."WebsitePolicySections" ("WebsitePolicyId", "Heading", "Text", "DisplayOrder")
SELECT p."WebsitePolicyId", s.heading, s.body, s.ord
FROM p,
(
    VALUES
    ('What we collect', 'When you contact us, book a test ride or buy a bike, we keep your name, phone number, address and the documents needed for sale and registration.', 1),
    ('How we use it', 'To answer you, process your purchase, register your bike, provide service and warranty, and tell you about service reminders.', 2),
    ('Sharing', 'We share details only with the manufacturer, BRTA, banks or finance partners when needed for your purchase, registration, warranty or EMI. We never sell your information.', 3),
    ('Your choices', 'You can ask us to update your details or to stop service messages at any time by calling or messaging us.', 4)
) AS s (heading, body, ord);

END
$$;
