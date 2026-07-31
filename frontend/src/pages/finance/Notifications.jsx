import React from 'react';
import SharedNotificationCenter from '../../components/SharedNotificationCenter';

function Notifications() {
  return (
    <SharedNotificationCenter 
      title="Notifications" 
      subtitle="Review system activity alerts, vendor PO updates, and banking settlement feeds." 
    />
  );
}

export default Notifications;
