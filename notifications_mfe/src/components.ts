// Presentational styled-components for notifications_mfe. Private to the
// remote (only ./mount is exposed).
//
// Unlike the other three remotes this one has no theme.ts: values are inlined,
// and it pulls styled-components v5 while the others use v6 - which is why the
// console warns about "several instances of styled-components" (§ 8).
import styled from 'styled-components';

export const NotificationContainer = styled.div`
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin: 15px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

export const NotificationTitle = styled.h3`
  color: #495057;
  margin: 0 0 15px 0;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 20px;
`;

export const StatCard = styled.div`
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  text-align: center;
`;

export const StatNumber = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 5px;
`;

export const StatLabel = styled.div`
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const ActivityFeed = styled.div`
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  max-height: 300px;
  overflow-y: auto;
`;

export const ActivityItem = styled.div`
  padding: 10px 15px;
  border-bottom: 1px solid #f1f3f4;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;

  &:last-child {
    border-bottom: none;
  }
`;

export const ActivityTime = styled.span`
  color: #6c757d;
  font-size: 12px;
  margin-left: auto;
`;

