#standardSQL
CREATE TEMPORARY FUNCTION countVulnerabilities(report STRING)
RETURNS INT64 LANGUAGE js AS  """
  try {
    const $ = JSON.parse(report);
    return $.audits['no-vulnerable-libraries'].extendedInfo.vulnerabilities.length;
  } catch (e) {
    return 0;
  }
""";

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
      countVulnerabilities(report) AS bin
    FROM
      `httparchive.lighthouse.${YYYY_MM_DD}*`
    WHERE
      report IS NOT NULL
    GROUP BY
      bin,
      client ) )
ORDER BY
  bin,
  client
