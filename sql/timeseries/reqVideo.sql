#standardSQL
SELECT
  CONCAT('20', SUBSTR(_TABLE_SUFFIX, 0, 8)) AS date,
  UNIX_DATE(CAST(REPLACE(CONCAT('20', SUBSTR(_TABLE_SUFFIX, 0, 8)), '_', '-') AS DATE)) * 1000 * 60 * 60 * 24 AS timestamp,
  IF(STRPOS(_TABLE_SUFFIX, '_mobile') = 0, 'desktop', 'mobile') AS client,
  ROUND(APPROX_QUANTILES(reqVideo, 1001)[OFFSET(101)], 2) AS p10,
  ROUND(APPROX_QUANTILES(reqVideo, 1001)[OFFSET(251)], 2) AS p25,
  ROUND(APPROX_QUANTILES(reqVideo, 1001)[OFFSET(501)], 2) AS p50,
  ROUND(APPROX_QUANTILES(reqVideo, 1001)[OFFSET(751)], 2) AS p75,
  ROUND(APPROX_QUANTILES(reqVideo, 1001)[OFFSET(901)], 2) AS p90
FROM
  `httparchive.runs.20*`
WHERE
  _TABLE_SUFFIX LIKE '%_pages%' AND
  reqVideo > 0
GROUP BY
  date,
  timestamp,
  client
ORDER BY
  date DESC,
  client
