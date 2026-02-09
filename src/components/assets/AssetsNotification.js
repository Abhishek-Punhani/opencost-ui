import React from "react";

const AssetsNotification = ({ show, onDismiss }) => {
  if (!show) return null;
  return (
    <div className="assets-notification">
      <span className="notif-icon">ℹ</span>
      <span>
        <strong>Demo mode</strong>
        Unable to reach the OpenCost API. Displaying sample data.
      </span>
      <button className="notif-dismiss" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
};

export default AssetsNotification;
