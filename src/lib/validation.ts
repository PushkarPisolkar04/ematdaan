
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one number' });
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one special character (@$!%*?&)' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateOrganizationName = (name: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!name.trim()) {
    errors.push({ field: 'name', message: 'Organization name is required' });
  } else if (name.length < 3) {
    errors.push({ field: 'name', message: 'Organization name must be at least 3 characters long' });
  } else if (name.length > 50) {
    errors.push({ field: 'name', message: 'Organization name must be less than 50 characters' });
  } else if (!/^[a-zA-Z0-9\s\-_&.()]+$/.test(name)) {
    errors.push({ field: 'name', message: 'Organization name contains invalid characters' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePersonName = (name: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!name.trim()) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
  } else if (name.length > 50) {
    errors.push({ field: 'name', message: 'Name must be less than 50 characters' });
  } else if (!/^[a-zA-Z\s]+$/.test(name)) {
    errors.push({ field: 'name', message: 'Name can only contain letters and spaces' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateOrganizationForm = (data: {
  name: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  confirmPassword: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  const nameValidation = validateOrganizationName(data.name);
  errors.push(...nameValidation.errors);
  
  const ownerNameValidation = validatePersonName(data.ownerName);
  errors.push(...ownerNameValidation.errors);
  
  if (!data.ownerEmail.trim()) {
    errors.push({ field: 'ownerEmail', message: 'Email is required' });
  } else if (!validateEmail(data.ownerEmail)) {
    errors.push({ field: 'ownerEmail', message: 'Please enter a valid email address' });
  }
  
  const passwordValidation = validatePassword(data.password);
  errors.push(...passwordValidation.errors);
  
  if (data.password !== data.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateLoginForm = (data: {
  email: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!data.email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateRegistrationForm = (data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  const nameValidation = validatePersonName(data.name);
  errors.push(...nameValidation.errors);
  
  if (!data.email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }
  
  const passwordValidation = validatePassword(data.password);
  errors.push(...passwordValidation.errors);
  
  if (data.password !== data.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateElectionForm = (data: {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Election name is required' });
  } else if (data.name.length < 3) {
    errors.push({ field: 'name', message: 'Election name must be at least 3 characters long' });
  } else if (data.name.length > 100) {
    errors.push({ field: 'name', message: 'Election name must be less than 100 characters' });
  }
  
  if (data.description && data.description.length > 500) {
    errors.push({ field: 'description', message: 'Description must be less than 500 characters' });
  }
  
  const now = new Date();
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  
  if (startTime <= now) {
    errors.push({ field: 'startTime', message: 'Start time must be in the future' });
  }
  
  if (endTime <= startTime) {
    errors.push({ field: 'endTime', message: 'End time must be after start time' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCandidateForm = (data: {
  name: string;
  party: string;
  symbol: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Candidate name is required' });
  } else if (data.name.length < 2) {
    errors.push({ field: 'name', message: 'Candidate name must be at least 2 characters long' });
  } else if (data.name.length > 50) {
    errors.push({ field: 'name', message: 'Candidate name must be less than 50 characters' });
  }
  
  if (data.party && data.party.length > 50) {
    errors.push({ field: 'party', message: 'Party name must be less than 50 characters' });
  }
  
  if (data.symbol && data.symbol.length > 20) {
    errors.push({ field: 'symbol', message: 'Symbol must be less than 20 characters' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
    
export const validateAccessCode = (code: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!code.trim()) {
    errors.push({ field: 'accessCode', message: 'Access code is required' });
  } else if (code.length < 6) {
    errors.push({ field: 'accessCode', message: 'Access code must be at least 6 characters' });
  } else if (code.length > 20) {
    errors.push({ field: 'accessCode', message: 'Access code must be less than 20 characters' });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 