#standardSQL
SELECT
  CONCAT('20', SUBSTR(_TABLE_SUFFIX, 0, 8)) AS date,
  UNIX_DATE(CAST(REPLACE(CONCAT('20', SUBSTR(_TABLE_SUFFIX, 0, 8)), '_', '-') AS DATE)) * 1000 * 60 * 60 * 24 AS timestamp,
  IF(STRPOS(_TABLE_SUFFIX, '_mobile') = 0, 'desktop', 'mobile') AS client,
  APPROX_QUANTILES(_connections, 1001)[OFFSET(101)] AS p10,
  APPROX_QUANTILES(_connections, 1001)[OFFSET(251)] AS p25,
  APPROX_QUANTILES(_connections, 1001)[OFFSET(501)] AS p50,
  APPROX_QUANTILES(_connections, 1001)[OFFSET(751)] AS p75,
  APPROX_QUANTILES(_connections, 1001)[OFFSET(901)] AS p90
FROM
  `httparchive.runs.20*`
WHERE
  _TABLE_SUFFIX LIKE '%_pages%' AND
  _connections > 0
GROUP BY
  date,
  timestamp,
  client
ORDER BY
  date DESC,
  client
