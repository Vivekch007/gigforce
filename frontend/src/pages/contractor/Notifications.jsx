import React from 'react';
import SharedNotificationCenter from '../../components/SharedNotificationCenter';

function Notifications() {
  return (
    <SharedNotificationCenter 
      title="Notifications" 
      subtitle="Manage system alerts and review logs." 
    />
  );
}

export default Notifications;
