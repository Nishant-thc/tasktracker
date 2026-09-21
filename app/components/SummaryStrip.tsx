import React from 'react';

type SummaryStripProps = {
  clientName: string;
  withClientCount: number;
  awaitingQcCount: number;
  closedCount: number;
  totalCount: number;
  oldestOpenDays: number;
  overdueCount: number;
  growthOnHoldPct: number;
  avgTimeToCloseDays?: number;
};

export default function SummaryStrip({
  clientName,
  withClientCount,
  awaitingQcCount,
  closedCount,
  totalCount,
  oldestOpenDays,
  growthOnHoldPct,
  avgTimeToCloseDays
}: SummaryStripProps) {
  const w = (x: number) => (x ? { flex: `${x} 1 0` } : { display: 'none' });

  return (
    <div className="strip">
      <div className="stats">
        <div className="stat">
          <span>With {clientName}</span>
          <b>{withClientCount}</b>
        </div>
        <div className="stat">
          <span>Awaiting QC</span>
          <b>{awaitingQcCount}</b>
        </div>
        <div className="stat">
          <span>Avg Time to Close</span>
          <b>{avgTimeToCloseDays !== undefined ? (avgTimeToCloseDays > 0 ? avgTimeToCloseDays : '< 1') : '-'} <small>days</small></b>
        </div>
        <div className="stat">
          <span>Closed</span>
          <b>
            {closedCount}<small>of {totalCount}</small>
          </b>
        </div>
        <div className={`stat ${oldestOpenDays >= 14 ? 'warn' : ''}`}>
          <span>Oldest open item</span>
          <b>
            {oldestOpenDays}<small>days</small>
          </b>
        </div>
        <div className={`stat ${growthOnHoldPct ? 'warn' : ''}`}>
          <span>Growth on hold</span>
          <b>
            +{growthOnHoldPct}<small>%</small>
          </b>
        </div>
      </div>
      <div
        className="court"
        role="img"
        aria-label={`${withClientCount} with client, ${awaitingQcCount} in QC, ${closedCount} closed`}
      >
        <i className="c1" style={w(withClientCount)}></i>
        <i className="c2" style={w(awaitingQcCount)}></i>
        <i className="c3" style={w(closedCount)}></i>
      </div>
    </div>
  );
}
