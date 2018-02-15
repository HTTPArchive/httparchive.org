#standardSQL
SELECT
  *,
  SUM(pdf) OVER (PARTITION BY client ORDER BY bin) AS cdf
FROM (
  SELECT
    *,
    volume / SUM(volume) OVER (PARTITION BY client) AS pdf
  FROM (
    SELECT
      IF(STRPOS(_TABLE_SUFFIX, '_mobile') = 0,
        'desktop',
        'mobile') AS client,
      COUNT(0) AS volume,
      reqCSS AS bin
    FROM
      `httparchive.summary_pages.${YYYY_MM_DD}*`
    GROUP BY
      bin,
      client ) )
ORDER BY
  bin,
  client
