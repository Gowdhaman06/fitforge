// ============================================
// FitForge — Workout Runner Logic
// ============================================

import { supabase } from './supabase.js';

// ---- Built-in Workout Library (Procedurally Generated 500+ Workouts) ----

const MASTER_EXERCISES = [
  { name: 'Push-ups', desc: 'Keep core tight, lower body until chest touches floor.', gifUrl: 'assets/images/exercises/pushup.png', type: 'Strength' },
  { name: 'Bodyweight Squats', desc: 'Chest up, push hips back.', gifUrl: 'assets/images/exercises/squat.png', type: 'Strength' },
  { name: 'Plank', desc: 'Hold a straight line from head to heels.', gifUrl: 'assets/images/exercises/plank.png', type: 'Strength' },
  { name: 'Jumping Jacks', desc: 'Fast pace! Arms straight, land softly.', gifUrl: 'assets/images/exercises/jumping_jacks.png', type: 'Cardio' },
  { name: 'Mountain Climbers', desc: 'Drive knees to chest quickly.', gifUrl: 'assets/images/exercises/mountain_climber.png', type: 'Cardio' },
  { name: 'Bicep Curls', desc: 'Keep elbows tucked, curl weight upwards.', gifUrl: 'assets/images/exercises/bicep_curl.png', type: 'Strength' },
  // Mapping variations to base 3D images
  { name: 'Wide Push-ups', desc: 'Hands wider than shoulder width.', gifUrl: 'assets/images/exercises/pushup.png', type: 'Strength' },
  { name: 'Diamond Push-ups', desc: 'Hands form a diamond under chest.', gifUrl: 'assets/images/exercises/pushup.png', type: 'Strength' },
  { name: 'Jump Squats', desc: 'Explode upwards from the squat position.', gifUrl: 'assets/images/exercises/squat.png', type: 'HIIT' },
  { name: 'Bulgarian Split Squats', desc: 'One foot elevated behind you.', gifUrl: 'assets/images/exercises/squat.png', type: 'Strength' },
  { name: 'Side Plank', desc: 'Support body on one forearm.', gifUrl: 'assets/images/exercises/plank.png', type: 'Strength' },
  { name: 'Spiderman Plank', desc: 'Bring knee to outside elbow.', gifUrl: 'assets/images/exercises/plank.png', type: 'Strength' },
  { name: 'High Knees', desc: 'Drive knees up quickly.', gifUrl: 'assets/images/exercises/jumping_jacks.png', type: 'Cardio' },
  { name: 'Burpees', desc: 'Drop to plank, pushup, jump up.', gifUrl: 'assets/images/exercises/mountain_climber.png', type: 'HIIT' },
  { name: 'Hammer Curls', desc: 'Neutral grip curl.', gifUrl: 'assets/images/exercises/bicep_curl.png', type: 'Strength' }
];

const CATEGORIES = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Flexibility'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const ADJECTIVES = ['Blast', 'Crusher', 'Inferno', 'Shredder', 'Builder', 'Pump', 'Flow', 'Burner', 'Routine', 'Circuit'];

function getRandomItem(arr, seed) {
  // Simple seeded random to keep workouts consistent across refreshes
  const x = Math.sin(seed++) * 10000;
  return arr[Math.floor((x - Math.floor(x)) * arr.length)];
}

function generateRandomWorkout(idNum) {
  const type = getRandomItem(CATEGORIES, idNum * 1);
  const adj = getRandomItem(ADJECTIVES, idNum * 2);
  const level = getRandomItem(LEVELS, idNum * 3);
  
  let title = '';
  if (type === 'Strength') title = ['Upper Body', 'Lower Body', 'Core', 'Full Body', 'Arm'][Math.floor(Math.abs(Math.sin(idNum * 4)) * 5)] + ' ' + adj;
  else title = type + ' ' + adj;

  const numExercises = Math.floor(Math.abs(Math.sin(idNum * 5)) * 3) + 4;
  const exercises = [];
  let totalMinutes = 0;

  for (let i = 0; i < numExercises; i++) {
    let pool = MASTER_EXERCISES.filter(e => e.type === type);
    if (pool.length === 0 || Math.abs(Math.sin(idNum * 6 + i)) > 0.7) pool = MASTER_EXERCISES;
    
    const ex = getRandomItem(pool, idNum * 7 + i);
    const sets = Math.floor(Math.abs(Math.sin(idNum * 8 + i)) * 3) + 2; 
    
    let repsStr = '';
    if (type === 'Cardio' || type === 'HIIT' || ex.name.includes('Plank')) {
      repsStr = (Math.floor(Math.abs(Math.sin(idNum * 9 + i)) * 4) + 3) * 10 + ' Seconds';
    } else {
      repsStr = (Math.floor(Math.abs(Math.sin(idNum * 10 + i)) * 3) + 2) * 5 + ' Reps';
    }
    
    exercises.push({
      name: ex.name,
      sets: sets,
      reps: repsStr,
      desc: ex.desc,
      gifUrl: ex.gifUrl
    });
    
    totalMinutes += (sets * 2);
  }

  return {
    id: \`workout-\${idNum}\`,
    title: title,
    type: type,
    duration: totalMinutes,
    calories: totalMinutes * (Math.floor(Math.abs(Math.sin(idNum * 11)) * 4) + 6),
    level: level,
    exercises: exercises
  };
}

const WORKOUT_DB = [];
// Generate 500 workouts on the fly!
for (let i = 1; i <= 500; i++) {
  WORKOUT_DB.push(generateRandomWorkout(i));
}

// Pagination State
let currentPage = 1;
const WORKOUTS_PER_PAGE = 24;
let activeFilter = 'all';

// ---- Runner State ----
let currentWorkout = null;
let currentExerciseIndex = 0;

// ---- DOM Elements ----
const modal = document.getElementById('workoutModal');
const btnClose = document.getElementById('closeModal');
const runnerContent = document.getElementById('runnerContent');
const workoutComplete = document.getElementById('workoutComplete');
const progressFill = document.getElementById('workoutProgress');

const exGif = document.getElementById('exerciseGif');
const exPlaceholder = document.getElementById('exercisePlaceholder');
const exName = document.getElementById('exerciseName');
const exSets = document.getElementById('exerciseSets');
const exReps = document.getElementById('exerciseReps');
const exDesc = document.getElementById('exerciseDesc');

const btnPrev = document.getElementById('btnPrevExercise');
const btnNext = document.getElementById('btnNextExercise');
const btnFinish = document.getElementById('btnFinishAndLog');

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  renderWorkoutGrid();
  if (window.lucide) window.lucide.createIcons();
});

function setupEventListeners() {
  if (btnClose) {
    btnClose.addEventListener('click', closeRunner);
  }

  // Setup 'Start Workout' buttons inside the grid
  document.addEventListener('click', (e) => {
    const startBtn = e.target.closest('.start-btn');
    if (startBtn) {
      const workoutId = startBtn.dataset.workoutId || 'full-body-strength';
      startRunner(workoutId);
    }
  });

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (!currentWorkout) return;
      if (currentExerciseIndex < currentWorkout.exercises.length - 1) {
        currentExerciseIndex++;
        updateRunnerUI();
      } else {
        showCompletionScreen();
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (!currentWorkout) return;
      if (currentExerciseIndex > 0) {
        currentExerciseIndex--;
        updateRunnerUI();
      }
    });
  }

  if (btnFinish) {
    btnFinish.addEventListener('click', logWorkoutAndReturn);
  }
  // Pagination setup
  const btnLoadMore = document.createElement('button');
  btnLoadMore.className = 'btn btn-outline w-100';
  btnLoadMore.style.marginTop = '2rem';
  btnLoadMore.style.gridColumn = '1 / -1';
  btnLoadMore.innerHTML = '<i data-lucide="chevron-down"></i> Load More Workouts';
  btnLoadMore.addEventListener('click', () => {
    currentPage++;
    renderWorkoutGrid(true);
  });
  
  // Attach filter listeners
  const filters = document.querySelectorAll('#filters .chip');
  if (filters) {
    filters.forEach(f => {
      f.addEventListener('click', () => {
        filters.forEach(c => c.classList.remove('active'));
        f.classList.add('active');
        activeFilter = f.dataset.filter || 'all';
        currentPage = 1;
        renderWorkoutGrid();
      });
    });
  }
}

function renderWorkoutGrid(append = false) {
  const grid = document.getElementById('grid');
  if (!grid) return;
  
  if (!append) grid.innerHTML = '';
  
  let filtered = WORKOUT_DB;
  if (activeFilter !== 'all') {
    filtered = WORKOUT_DB.filter(w => w.type === activeFilter);
  }
  
  const startIdx = (currentPage - 1) * WORKOUTS_PER_PAGE;
  const endIdx = startIdx + WORKOUTS_PER_PAGE;
  const pageItems = filtered.slice(startIdx, endIdx);
  
  pageItems.forEach(w => {
    const card = document.createElement('div');
    card.className = 'workout-card';
    card.innerHTML = `
      <div class="workout-card-img" style="background: linear-gradient(45deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center;">
        <i data-lucide="activity" style="width: 48px; height: 48px; color: white;"></i>
      </div>
      <div class="workout-card-content">
        <h3 style="margin-bottom: 8px;">${w.title}</h3>
        <div class="workout-stats" style="margin-bottom: 16px; font-size: 0.9rem;">
          <span><i data-lucide="clock"></i> ${w.duration} min</span>
          <span><i data-lucide="flame"></i> ~${w.calories} cal</span>
        </div>
        <button class="btn btn-outline w-100 start-btn" data-workout-id="${w.id}">
          Start Routine
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
  
  // Handle Load More button
  const oldBtn = document.getElementById('btnLoadMore');
  if (oldBtn) oldBtn.remove();
  
  if (endIdx < filtered.length) {
    const btnLoadMore = document.createElement('button');
    btnLoadMore.id = 'btnLoadMore';
    btnLoadMore.className = 'btn btn-outline w-100';
    btnLoadMore.style.marginTop = '2rem';
    btnLoadMore.style.gridColumn = '1 / -1';
    btnLoadMore.innerHTML = '<i data-lucide="chevron-down"></i> Load More Workouts (' + (filtered.length - endIdx) + ' remaining)';
    btnLoadMore.addEventListener('click', () => {
      currentPage++;
      renderWorkoutGrid(true);
    });
    grid.appendChild(btnLoadMore);
  }
  
  if (window.lucide) window.lucide.createIcons();
}

function startRunner(workoutId) {
  currentWorkout = WORKOUT_DB.find(w => w.id === workoutId);
  if (!currentWorkout) return;
  
  currentExerciseIndex = 0;
  
  // Reset UI
  runnerContent.style.display = 'block';
  workoutComplete.style.display = 'none';
  progressFill.style.width = '0%';
  
  updateRunnerUI();
  
  // Show Modal
  modal.classList.add('active');
}

function updateRunnerUI() {
  const exercise = currentWorkout.exercises[currentExerciseIndex];
  
  exName.textContent = exercise.name;
  exSets.textContent = `Set 1 of ${exercise.sets}`;
  exReps.textContent = exercise.reps;
  exDesc.textContent = exercise.desc;
  
  if (exercise.gifUrl) {
    exGif.src = exercise.gifUrl;
    exGif.style.display = 'block';
    exPlaceholder.style.display = 'none';
  } else {
    exGif.style.display = 'none';
    exPlaceholder.style.display = 'block';
  }
  
  // Update Buttons
  btnPrev.disabled = currentExerciseIndex === 0;
  
  if (currentExerciseIndex === currentWorkout.exercises.length - 1) {
    btnNext.innerHTML = 'Finish Workout <i data-lucide="check"></i>';
    btnNext.classList.remove('btn-primary');
    btnNext.classList.add('btn-success');
    btnNext.style.background = 'var(--success)';
  } else {
    btnNext.innerHTML = 'Next Exercise <i data-lucide="chevron-right"></i>';
    btnNext.classList.add('btn-primary');
    btnNext.classList.remove('btn-success');
    btnNext.style.background = 'var(--primary)';
  }
  
  // Update Progress
  const progressPercent = ((currentExerciseIndex) / currentWorkout.exercises.length) * 100;
  progressFill.style.width = `${progressPercent}%`;
  
  if (window.lucide) window.lucide.createIcons();
}

function showCompletionScreen() {
  runnerContent.style.display = 'none';
  workoutComplete.style.display = 'block';
  progressFill.style.width = '100%';
  
  document.getElementById('finalCalories').textContent = currentWorkout.calories;
  document.getElementById('finalDuration').textContent = currentWorkout.duration;
  
  if (window.lucide) window.lucide.createIcons();
}

async function logWorkoutAndReturn() {
  const originalText = btnFinish.innerHTML;
  btnFinish.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Saving...';
  btnFinish.disabled = true;
  if (window.lucide) window.lucide.createIcons();
  
  try {
    // Only save if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const todayStr = new Date().toISOString().split('T')[0];
      await supabase.from('workout_logs').insert({
        user_id: session.user.id,
        workout_name: currentWorkout.title,
        calories_burned: currentWorkout.calories,
        duration_minutes: currentWorkout.duration,
        completed_date: todayStr
      });
    }
  } catch (err) {
    console.error('Failed to log workout', err);
  }
  
  btnFinish.innerHTML = originalText;
  btnFinish.disabled = false;
  
  // Redirect to dashboard so they see the chart update
  window.location.href = 'dashboard.html';
}

function closeRunner() {
  modal.classList.remove('active');
  currentWorkout = null;
  currentExerciseIndex = 0;
}
