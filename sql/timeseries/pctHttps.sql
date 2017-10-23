#standardSQL
SELECT
  CONCAT('20', SUBSTR(_TABLE_SUFFIX, 0, 8)) AS date,
  UNIX_DATE(CAST(REPLACE(CONCAT('20', SUBSTR(_TABLE_SUFFIX, 0, 8)), '_', '-') AS DATE)) * 1000 * 60 * 60 * 24 AS timestamp,
  IF(STRPOS(_TABLE_SUFFIX, '_mobile') = 0, 'desktop', 'mobile') AS client,
  ROUND(SUM(IF(STARTS_WITH(url, 'https'), 1, 0)) * 100 / COUNT(0), 2) AS percent
FROM
  `httparchive.summary_requests.20*`
GROUP BY
  date,
  timestamp,
  client
ORDER BY
  date DESC,
  client
