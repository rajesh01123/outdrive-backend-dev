import { createImageUpload, storedUploadPath } from './image-upload.js';

export const profileUpload = createImageUpload({ folder: 'profiles', field: 'profile_picture', maxSizeMb: 5 });

export const storedProfilePath = (file) => storedUploadPath('profiles', file);
