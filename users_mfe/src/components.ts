import styled from 'styled-components';
import { theme } from './theme';

export const MfeContainer = styled.div`
  border: 2px solid ${theme.colors.success};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.md};
  background: ${theme.colors.white};
  box-shadow: ${theme.shadows.md};
  font-family: ${theme.typography.fontFamily};
`;

export const MfeTitle = styled.h2`
  color: ${theme.colors.success};
  margin: 0 0 ${theme.spacing.md} 0;
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const StatusMessage = styled.p<{ variant: 'loading' | 'error' }>`
  color: ${props => props.variant === 'loading' ? theme.colors.info : theme.colors.danger};
  font-weight: ${theme.typography.fontWeight.medium};
  padding: ${theme.spacing.sm};
  background: ${props => props.variant === 'loading' ? theme.colors.gray100 : '#fee'};
  border-radius: ${theme.borderRadius.sm};
  margin: ${theme.spacing.sm} 0;
  border-left: 4px solid ${props => props.variant === 'loading' ? theme.colors.info : theme.colors.danger};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

export const UsersList = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${theme.spacing.md} 0;
  max-height: 400px;
  overflow-y: auto;
`;

export const UsersListItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.xs} 0;
  background: linear-gradient(135deg, ${theme.colors.gray100}, ${theme.colors.white});
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.success};
  transition: all ${theme.transitions.fast};

  &:hover {
    background: linear-gradient(135deg, ${theme.colors.gray200}, ${theme.colors.gray100});
    transform: translateX(3px);
    box-shadow: ${theme.shadows.sm};
  }
`;

export const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

export const UserName = styled.strong`
  color: ${theme.colors.success};
  font-size: ${theme.typography.fontSize.md};
  font-weight: ${theme.typography.fontWeight.bold};
`;

export const UserEmail = styled.span`
  color: ${theme.colors.gray600};
  font-size: ${theme.typography.fontSize.sm};
`;

export const InputContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.md};
  align-items: center;
  padding: ${theme.spacing.md};
  background: ${theme.colors.gray100};
  border-radius: ${theme.borderRadius.sm};
  border-left: 3px solid ${theme.colors.success};
`;

export const Input = styled.input`
  flex: 1;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 2px solid ${theme.colors.gray300};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.md};
  transition: border-color ${theme.transitions.fast};

  &:focus {
    outline: none;
    border-color: ${theme.colors.success};
    box-shadow: 0 0 0 3px ${theme.colors.success}20;
  }

  &::placeholder {
    color: ${theme.colors.gray500};
  }
`;

export const Button = styled.button<{ variant?: 'primary' | 'danger' | 'secondary'; disabled?: boolean }>`
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
      case 'danger': return theme.colors.danger;
      case 'secondary': return theme.colors.gray600;
      default: return theme.colors.success;
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

export const RemoveButton = styled(Button).attrs({ variant: 'danger' as const })`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.xs};
  min-width: auto;
`;