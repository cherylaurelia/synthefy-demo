#!/bin/sh
# Pull the SF 311 rows used in the study (DataSF Socrata API, no key needed).
mkdir -p data && curl -sSLG -o data/sf311-new.csv "https://data.sf.gov/resource/vw6y-z8j6.csv" \
  --data-urlencode "\$select=service_request_id,requested_datetime,closed_date,status_description,service_name,service_subtype,analysis_neighborhood,supervisor_district,source,lat,long" \
  --data-urlencode "\$where=requested_datetime>='2026-07-01' AND requested_datetime<'2026-11-01' AND service_name in('Street Defect','Streetlights','Sewer','Tree Maintenance','Graffiti Public','Sidewalk and Curb','Blocked Street and Sidewalk','Litter Receptacle Maintenance','Damage Property','Encampment')" \
  --data-urlencode "\$limit=200000"
