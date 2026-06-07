/**
 * 组织系统 API
 */
import { get, post, patch, del } from '../utils/http';

export function getMyOrganizations() {
  return get('/api/organizations/me');
}

export function getOrganizations(type) {
  const q = type ? `?type=${encodeURIComponent(type)}` : '';
  return get(`/api/organizations${q}`);
}

export function createOrganization(body) {
  return post('/api/organizations', body);
}

export function updateOrganization(id, body) {
  return patch(`/api/organizations/${id}`, body);
}

export function getOrganizationMembers(id) {
  return get(`/api/organizations/${id}/members`);
}

export function addOrganizationMember(id, body) {
  return post(`/api/organizations/${id}/members`, body);
}

export function updateOrganizationMember(orgId, membershipId, body) {
  return patch(`/api/organizations/${orgId}/members/${membershipId}`, body);
}

export function removeOrganizationMember(orgId, membershipId) {
  return del(`/api/organizations/${orgId}/members/${membershipId}`);
}

export function searchUsersByEmail(email) {
  return get(`/api/organizations/users/search?email=${encodeURIComponent(email || '')}`);
}
