// ============================================
// FitForge — Workout Runner Logic
// ============================================

import { supabase } from './supabase.js';

// ---- Built-in Workout Library ----
const WORKOUT_DB = [
  {
    id: 'full-body-strength',
    title: 'Full Body Strength',
    duration: 45,
    calories: 380,
    level: 'Intermediate',
    exercises: [
      {
        name: 'Push-ups',
        sets: 3,
        reps: '12 Reps',
        desc: 'Keep your core tight and lower your body until your chest almost touches the floor.',
        gifUrl: 'assets/images/exercises/pushup.png'
      },
      {
        name: 'Bodyweight Squats',
        sets: 3,
        reps: '15 Reps',
        desc: 'Keep your chest up and push your hips back as if sitting in a chair.',
        gifUrl: 'assets/images/exercises/squat.png'
      },
      {
        name: 'Plank',
        sets: 3,
        reps: '60 Seconds',
        desc: 'Hold a straight line from your head to your heels. Breathe steadily.',
        gifUrl: 'assets/images/exercises/plank.png'
      }
    ]
  },
  {
    id: 'hiit-cardio',
    title: 'HIIT Cardio Blast',
    duration: 20,
    calories: 250,
    level: 'Advanced',
    exercises: [
      {
        name: 'Jumping Jacks',
        sets: 4,
        reps: '45 Seconds',
        desc: 'Fast pace! Keep your arms straight and land softly on the balls of your feet.',
        gifUrl: 'assets/images/exercises/jumping_jacks.png'
      },
      {
        name: 'Mountain Climbers',
        sets: 4,
        reps: '45 Seconds',
        desc: 'Drive your knees to your chest quickly while maintaining a solid plank position.',
        gifUrl: 'assets/images/exercises/mountain_climber.png'
      }
    ]
  }
];

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
}

function renderWorkoutGrid() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  WORKOUT_DB.forEach(w => {
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
