import { Clock, CheckCircle, Truck, MapPin, Check } from 'lucide-react';
import { getStatuses, isStatusComplete, isStatusCurrent, getStatusTimestamps } from '../../services/orderStatusService';

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Pending' },
  confirmed: { icon: CheckCircle, label: 'Confirmed' },
  shipped: { icon: Truck, label: 'Shipped' },
  delivered: { icon: MapPin, label: 'Delivered' }
};

export default function OrderTimeline({ orderId, currentStatus }) {
  const statuses = getStatuses();
  const timestamps = getStatusTimestamps(orderId);

  const formatTime = (isoString) => {
    if (!isoString) return null;
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-slate-700" />

        {/* Progress line */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary-500 transition-all duration-500"
          style={{
            width: `${(statuses.indexOf(currentStatus) / (statuses.length - 1)) * 100}%`
          }}
        />

        {statuses.map((status, index) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          const isComplete = isStatusComplete(currentStatus, status);
          const isCurrent = isStatusCurrent(currentStatus, status);
          const timestamp = timestamps[status];

          return (
            <div
              key={status}
              className="relative flex flex-col items-center z-10"
              style={{ flex: 1 }}
            >
              {/* Status circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${isComplete
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
                  }
                  ${isCurrent && !isComplete ? 'ring-4 ring-primary-200 dark:ring-primary-900' : ''}
                  ${isCurrent ? 'animate-pulse' : ''}
                `}
              >
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  mt-2 text-xs font-medium
                  ${isComplete
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500'
                  }
                `}
              >
                {config.label}
              </span>

              {/* Timestamp */}
              {timestamp && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatTime(timestamp)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
