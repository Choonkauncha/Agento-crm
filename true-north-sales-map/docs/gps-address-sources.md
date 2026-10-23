# Users GPS example address verification

Verified on October 23, 2026. All eleven addresses already exist in `data/leads.json` with numeric latitude/longitude and `geocodeMatch: "Exact"`; no duplicate map leads were added.

These public property pages establish that the addresses identify residential houses. Existing map geocodes are reused; they have not been independently surveyed or confirmed at roof/door precision. No property-owner names, phone numbers, prices, or resident information were copied.

| Existing lead ID | Address | Existing coordinates | Address evidence |
| --- | --- | --- | --- |
| `csv-154030078` | 1605 GRACE ST, Mansfield, OH 44905-2744 | 40.7707123, -82.4569963 | [Zillow SingleFamily property page](https://www.zillow.com/homedetails/1605-Grace-St-Mansfield-OH-44905/86605001_zpid/) |
| `csv-158610267` | 1334 CHEW RD, Mansfield, OH 44903-9228 | 40.7265057, -82.4644424 | [Zillow Single Family Residence property page](https://www.zillow.com/homedetails/1334-Chew-Rd-Mansfield-OH-44903/116239376_zpid/) |
| `csv-156303113` | 2279 MANSFIELD LUCAS RD, Mansfield, OH 44903-8694 | 40.7175797, -82.458167 | [Realtor.com Single Family property page](https://www.realtor.com/realestateandhomes-detail/2279-Mansfield-Lucas-Rd_Mansfield_OH_44903_M35636-28064) |
| `csv-155842143` | 60 RAMBLESIDE DR, Mansfield, OH 44907-2028 | 40.734159, -82.5155661 | [Redfin residential property page](https://www.redfin.com/OH/Mansfield/60-Rambleside-Dr-44907/home/126468418) |
| `csv-157769308` | 836 PEACEFUL PATH, Mansfield, OH 44907-2022 | 40.7370016, -82.519611 | [Redfin residential property page](https://www.redfin.com/OH/Mansfield/836-Peaceful-Path-44907/home/126500948) |
| `csv-159458971` | 1051 YORKWOOD RD, Mansfield, OH 44907-2434 | 40.7301027, -82.5254566 | [Redfin residential property page](https://www.redfin.com/OH/Mansfield/1051-Yorkwood-Rd-44907/home/126334072) |
| `csv-158275110` | 688 COLEMAN RD, Mansfield, OH 44903-1845 | 40.7507157, -82.5408982 | [Redfin residential property page](https://www.redfin.com/OH/Mansfield/688-Coleman-Rd-44903/home/126140646) |
| `csv-158242739` | 850 ARLINGTON AVE, Mansfield, OH 44903-7020 | 40.7513908, -82.54709 | [Redfin residential property page](https://www.redfin.com/OH/Mansfield/850-Arlington-Ave-44903/home/126246452) |
| `csv-156819558` | 98 PARKWOOD BLVD, Mansfield, OH 44906-3218 | 40.756602, -82.5391833 | [Zillow SingleFamily property page](https://www.zillow.com/homedetails/98-Parkwood-Blvd-Mansfield-OH-44906/86610360_zpid/) |
| `csv-154805610` | 121 PARKWOOD BLVD, Mansfield, OH 44906-3217 | 40.756159, -82.5390415 | [Zillow SingleFamily property page](https://www.zillow.com/homedetails/121-Parkwood-Blvd-Mansfield-OH-44906/86611300_zpid/) |
| `csv-155222424` | 2699 LEXINGTON STEAM CORNERS RD, Lexington, OH 44904-8610 | 40.6803959, -82.6101311 | [Zillow SingleFamily property page](https://www.zillow.com/homedetails/2699-Lexington-Steam-Corners-Rd-Lexington-OH-44904/86630405_zpid/) |

## Example activity integrity

`data/gps-preview.json` contains eleven simulated visits, each explicitly marked `source: "preview"`. The fictional schedule is October 23, 2026, from 4:30 p.m. to 6:00 p.m. in America/New_York. It contains 55 minutes at houses and 35 minutes of unassigned gaps. Those gaps are illustrative spacing, not measured travel times or a verified driving route.

Show these entries in the same management timeline as requested, with an Example label so their source is distinguishable. Never insert them as real shifts or GPS samples, count them in actual totals, payroll or employee productivity, or describe them as evidence that anyone attended these homes.

The fixture deliberately contains no employee ID or name. Bind it to the requested administrator only after authorization in the management API. Gate display and data responses to active management users.

The original six visit IDs are preserved. Added IDs preview-visit-7 through preview-visit-11 identify the five extra homes. The list is ordered chronologically, rather than by fixture ID.

## County GIS scope

The official [Richland County CAMA Data page](https://www.richlandcountyoh.gov/departments/auditor/CamaData) provides CAMA and shape-file downloads. Its published disclaimer says map lines are reference material and are not survey accurate. The public residential listings above supplied the address-level verification for this fixture; the county page alone did not verify these individual addresses.

705 W Longview Avenue was considered and excluded because accessible public records conflicted on whether it represents a house or vacant residential land.
