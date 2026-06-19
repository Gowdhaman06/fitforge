import { supabase } from './supabase.js';
import { showToast } from './app.js';

let currentUser = null;
let currentAvatarBase64 = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  checkAuthAndLoad();
  setupAvatarUpload();
  setupFormSubmit();
  setupLogout();
});

async function checkAuthAndLoad() {
  if (!supabase) {
    showToast('Demo mode active', 'info');
    return;
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    window.location.href = 'login.html';
    return;
  }
  
  currentUser = session.user;
  loadProfileData();
}

async function loadProfileData() {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    // The name could be in user metadata or profiles table (we will add it to profiles now)
    const authName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    
    document.getElementById('fullName').value = profile?.full_name || authName;
    if (profile) {
      if (profile.age) document.getElementById('age').value = profile.age;
      if (profile.gender) document.getElementById('gender').value = profile.gender;
      if (profile.height) document.getElementById('height').value = profile.height;
      if (profile.weight) document.getElementById('weight').value = profile.weight;
      if (currentUser.user_metadata?.country) document.getElementById('country').value = currentUser.user_metadata.country;
      if (currentUser.user_metadata?.state) document.getElementById('state').value = currentUser.user_metadata.state;
      
      if (currentUser.user_metadata?.avatar_url) {
        currentAvatarBase64 = currentUser.user_metadata.avatar_url;
        setAvatarPreview(currentUser.user_metadata.avatar_url);
      } else {
        setAvatarPreviewFallback(document.getElementById('fullName').value);
      }
    } else {
      setAvatarPreviewFallback(authName);
    }
    
    // Update sidebar
    document.getElementById('sidebarProfileName').textContent = document.getElementById('fullName').value;

  } catch (err) {
    console.error('Error loading profile:', err);
    showToast('Failed to load profile details', 'error');
  }
}

function setAvatarPreview(url) {
  const preview = document.getElementById('avatarPreview');
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  
  preview.style.backgroundImage = `url(${url})`;
  preview.innerHTML = '';
  preview.style.border = 'none';
  
  if (sidebarAvatar) {
    sidebarAvatar.style.backgroundImage = `url(${url})`;
    sidebarAvatar.style.backgroundSize = 'cover';
    sidebarAvatar.innerHTML = '';
  }
}

function setAvatarPreviewFallback(name) {
  const letter = (name || 'A').charAt(0).toUpperCase();
  const preview = document.getElementById('avatarPreview');
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  
  preview.style.backgroundImage = 'none';
  preview.innerHTML = letter;
  
  if (sidebarAvatar) {
    sidebarAvatar.style.backgroundImage = 'none';
    sidebarAvatar.innerHTML = `<span id="sidebarAvatarLetter">${letter}</span>`;
  }
}

function setupAvatarUpload() {
  const input = document.getElementById('avatarInput');
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be less than 2MB', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      // Compress the image before saving
      compressImage(event.target.result, 300, 300, (base64) => {
        currentAvatarBase64 = base64;
        setAvatarPreview(base64);
      });
    };
    reader.readAsDataURL(file);
  });
}

function compressImage(base64Str, maxWidth, maxHeight, callback) {
  const img = new Image();
  img.src = base64Str;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }
    }
    
    // Crop to square
    const size = Math.min(width, height);
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;
    
    // Fill background for transparent PNGs converted to JPEG
    ctx.fillStyle = '#12121a';
    ctx.fillRect(0, 0, size, size);
    
    // Draw centered and cropped
    ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
    
    callback(canvas.toDataURL('image/jpeg', 0.8));
  };
}

function setupFormSubmit() {
  const form = document.getElementById('settingsForm');
  const btnSave = document.getElementById('btnSave');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase || !currentUser) return;
    
    btnSave.disabled = true;
    btnSave.innerHTML = '<i data-lucide="loader-2" class="animate-pulse"></i> Saving...';
    if (window.lucide) lucide.createIcons();
    
    const fullName = document.getElementById('fullName').value;
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    
    // Recalculate BMI
    const heightM = height / 100;
    const bmiVal = parseFloat((weight / (heightM * heightM)).toFixed(1));
    let category = 'Normal';
    if (bmiVal < 18.5) category = 'Underweight';
    else if (bmiVal >= 25 && bmiVal < 30) category = 'Overweight';
    else if (bmiVal >= 30) category = 'Obese';
    
    const profileUpdates = {
      id: currentUser.id,
      age: parseInt(document.getElementById('age').value),
      gender: document.getElementById('gender').value,
      height: height,
      weight: weight,
      bmi: bmiVal,
      bmi_category: category,
      updated_at: new Date()
    };
    
    try {
      const { error } = await supabase.from('profiles').upsert(profileUpdates);
      if (error) throw error;
      
      // Update Auth Metadata for fields that don't exist in the SQL table
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          full_name: fullName,
          country: document.getElementById('country').value,
          state: document.getElementById('state').value,
          avatar_url: currentAvatarBase64
        }
      });
      
      if (authError) throw authError;
      
      showToast('Profile updated successfully!', 'success');
      
      // Update sidebar immediately
      document.getElementById('sidebarProfileName').textContent = fullName;
      
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save profile: ' + err.message, 'error');
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = '<i data-lucide="save"></i> Save Changes';
      if (window.lucide) lucide.createIcons();
    }
  });
}

function setupLogout() {
  const btnLogout = document.getElementById('btnLogout');
  btnLogout.addEventListener('click', async () => {
    if (confirm('Are you sure you want to log out?')) {
      if (supabase) await supabase.auth.signOut();
      window.location.href = 'login.html';
    }
  });
}
