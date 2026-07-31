import React from 'react';
import SharedNotificationCenter from '../../components/SharedNotificationCenter';

function Notifications() {
  return (
    <SharedNotificationCenter 
      title="Notifications" 
      subtitle="Review system activity alerts, candidate proposals, and billing approvals feed." 
    />
  );
}

export default Notifications;
