#legacySQL
SELECT
  *
FROM
(
SELECT
  'desktop' AS client,
  volume,
  bin,
  pdf,
  SUM(pdf) OVER (ORDER BY bin) AS cdf
FROM
(
  SELECT
    COUNT(0) AS volume,
    pages.reqJS AS bin,
    RATIO_TO_REPORT(volume) OVER () AS pdf
  FROM
    [httparchive:runs.${YYYY_MM_DD}_pages] AS pages
  GROUP BY
    bin
)
GROUP BY
  volume, bin, pdf
), (
SELECT
  'mobile' AS client,
  volume,
  bin,
  pdf,
  SUM(pdf) OVER (ORDER BY bin) AS cdf
FROM
(
  SELECT
    COUNT(0) AS volume,
    pages.reqJS AS bin,
    RATIO_TO_REPORT(volume) OVER () AS pdf
  FROM
    [httparchive:runs.${YYYY_MM_DD}_pages_mobile] AS pages
  GROUP BY
    bin
)
GROUP BY
  volume, bin, pdf
)
ORDER BY
  bin,
  client
