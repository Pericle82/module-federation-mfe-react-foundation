// Presentational styled-components for mfe_2, built on the local `theme`.
// Private to the remote (only ./mount is exposed).
//
// NOTE (COMPREHENSIVE_GUIDE.md § 10.7): `Button` takes a `variant` prop that is
// not transient, so styled-components forwards it to the DOM and React logs
// "unknown prop variant". Renaming it to `$variant` (here and at the call sites
// in mount.tsx) silences it.
import styled from 'styled-components';
import { theme } from './theme';

export const MfeContainer = styled.div`
  border: 2px solid ${theme.colors.info};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.md};
  background: ${theme.colors.white};
  box-shadow: ${theme.shadows.md};
  font-family: ${theme.typography.fontFamily};
`;

export const MfeTitle = styled.h2`
  color: ${theme.colors.info};
  margin: 0 0 ${theme.spacing.md} 0;
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
`;

export const LoadingNotification = styled.div`
  color: ${theme.colors.warning};
  font-weight: ${theme.typography.fontWeight.bold};
  background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.sm};
  margin: ${theme.spacing.sm} 0;
  border: 1px solid #ffeaa7;
  border-left: 4px solid ${theme.colors.warning};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  animation: pulse 2s infinite;

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.8; }
    100% { opacity: 1; }
  }
`;

export const FilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  align-items: center;
  margin: ${theme.spacing.md} 0;
  padding: ${theme.spacing.md};
  background: ${theme.colors.gray100};
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.info};
`;

export const FilterInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 2px solid ${theme.colors.gray300};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.md};
  transition: border-color ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.info};
    box-shadow: 0 0 0 3px ${theme.colors.info}20;
  }

  &::placeholder {
    color: ${theme.colors.gray500};
  }
`;

export const FilterStatus = styled.span`
  color: ${theme.colors.gray600};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  background: ${theme.colors.white};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid ${theme.colors.gray300};
`;

export const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'success'; disabled?: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: none;
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all ${theme.transitions.fast};
  white-space: nowrap;
  
  background: ${props => {
    if (props.disabled) return theme.colors.gray400;
    switch (props.variant) {
      case 'secondary': return theme.colors.gray600;
      case 'success': return theme.colors.success;
      default: return theme.colors.info;
    }
  }};
  
  color: ${theme.colors.white};
  opacity: ${props => props.disabled ? 0.6 : 1};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: ${theme.shadows.sm};
    filter: brightness(1.1);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

export const ItemsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${theme.spacing.md} 0;
  max-height: 400px;
  overflow-y: auto;
`;

export const ItemsListItem = styled.li`
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.xs} 0;
  background: linear-gradient(135deg, ${theme.colors.gray100}, ${theme.colors.white});
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.info};
  transition: all ${theme.transitions.fast};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  &:hover {
    background: linear-gradient(135deg, ${theme.colors.gray200}, ${theme.colors.gray100});
    transform: translateX(2px);
    box-shadow: ${theme.shadows.sm};
  }

  &:before {
    content: "📄";
    font-size: ${theme.typography.fontSize.lg};
  }
`;