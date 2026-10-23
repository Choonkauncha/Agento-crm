# Users GPS preview address verification

Verified on October 23, 2026. All six addresses already exist in `data/leads.json` with numeric latitude/longitude and `geocodeMatch: "Exact"`; no duplicate map leads were added.

These public property pages establish that the addresses identify residential houses. Existing map geocodes are reused; they have not been independently surveyed or confirmed at roof/door precision. No property-owner names, phone numbers, prices, or resident information were copied.

| Existing lead ID | Address | Existing coordinates | Address evidence |
| --- | --- | --- | --- |
| `csv-159458971` | 1051 YORKWOOD RD, Mansfield, OH 44907-2434 | 40.7301027, -82.5254566 | [Redfin residential property page](https://www.redfin.com/OH/Mansfield/1051-Yorkwood-Rd-44907/home/126334072) |
| `csv-158242739` | 850 ARLINGTON AVE, Mansfield, OH 44903-7020 | 40.7513908, -82.54709 | [Redfin residential property page](https://www.redfin.com/OH/Mansfield/850-Arlington-Ave-44903/home/126246452) |
| `csv-156819558` | 98 PARKWOOD BLVD, Mansfield, OH 44906-3218 | 40.756602, -82.5391833 | [Zillow SingleFamily property page](https://www.zillow.com/homedetails/98-Parkwood-Blvd-Mansfield-OH-44906/86610360_zpid/) |
| `csv-154805610` | 121 PARKWOOD BLVD, Mansfield, OH 44906-3217 | 40.756159, -82.5390415 | [Zillow SingleFamily property page](https://www.zillow.com/homedetails/121-Parkwood-Blvd-Mansfield-OH-44906/86611300_zpid/) |
| `csv-157769308` | 836 PEACEFUL PATH, Mansfield, OH 44907-2022 | 40.7370016, -82.519611 | [Redfin residential property page](https://www.redfin.com/OH/Mansfield/836-Peaceful-Path-44907/home/126500948) |
| `csv-155222424` | 2699 LEXINGTON STEAM CORNERS RD, Lexington, OH 44904-8610 | 40.6803959, -82.6101311 | [Zillow SingleFamily property page](https://www.zillow.com/homedetails/2699-Lexington-Steam-Corners-Rd-Lexington-OH-44904/86630405_zpid/) |

## Preview separation

`data/gps-preview.json` contains six simulated visits, each explicitly marked `source: "preview"`. The durations are 7, 11, 5, 9, 13, and 8 minutes. The fictional schedule is October 23, 2026, in America/New_York. It must be rendered as preview activity, never inserted as real shifts or GPS samples, never counted in payroll or employee productivity, and never described as evidence that anyone attended these homes.

The fixture deliberately contains no employee ID or name. Bind it to the requested administrator only after authorization in the management API. Gate display and data responses to active management users. The real GPS history remains separate.

## County GIS scope

The official [Richland County CAMA Data page](https://www.richlandcountyoh.gov/departments/auditor/CamaData) provides CAMA and shape-file downloads. Its published disclaimer says map lines are reference material and are not survey accurate. The public residential listings above supplied the address-level verification for this fixture; the county page alone did not verify these individual addresses.
