const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: '邮箱不能为空' };
  }
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '邮箱不能为空' };
  }
  if (trimmed.length > 254) {
    return { valid: false, error: '邮箱格式不正确' };
  }
  if (!EMAIL_RE.test(trimmed)) {
    return { valid: false, error: '邮箱格式不正确' };
  }
  return { valid: true };
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: '密码不能为空' };
  }
  if (password.length < 6) {
    return { valid: false, error: '密码至少需要6个字符' };
  }
  return { valid: true };
}

function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: '昵称不能为空' };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '昵称不能为空' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: '昵称不能超过50个字符' };
  }
  return { valid: true };
}

function sanitizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || 'user',
    createdAt: row.created_at,
  };
}

module.exports = { validateEmail, validatePassword, validateName, sanitizeUser };
