import React from 'react';
import SharedNotificationCenter from '../../components/SharedNotificationCenter';

function Notifications() {
  return (
    <SharedNotificationCenter 
      title="Security Alerts center" 
      subtitle="Audit security events logs, system policy validations, and platform user logins warnings." 
    />
  );
}

export default Notifications;
