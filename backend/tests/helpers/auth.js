const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { signToken } = require('../../src/services/auth.service');

const PASSWORD = 'Passw0rdOK';

// Registers a brand-new organization through the real API; its first user is the admin.
async function registerOrg(orgName, email) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ organizationName: orgName, name: `${orgName} Admin`, email, password: PASSWORD });
  if (res.status !== 201) throw new Error(`registerOrg failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, user: res.body.user, organizationId: res.body.user.organizationId };
}

// Adds a user with a given role to an existing organization (registration only makes admins).
async function addUser(organizationId, role, email) {
  const user = await User.create({
    organizationId,
    name: `${role} user`,
    email,
    passwordHash: await bcrypt.hash(PASSWORD, 4),
    role,
  });
  return { user, token: signToken(user) };
}

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { registerOrg, addUser, bearer, PASSWORD };
