/* Phase 4 — shared browser-side gamification core.
   Consolidates shared constants, access helpers, normalizers, cache/date helpers,
   DOM utilities and presentation styles for the V5.7.1A–V5.7.4 gamification
   feature. Supabase RPC contracts remain unchanged. */
(() => {
  'use strict';

  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  if (ROOT.GamificationCore) {
    if (typeof module !== 'undefined' && module.exports) module.exports = ROOT.GamificationCore;
    return;
  }

  const CACHE_MS = 15000;
  const STYLE_ID = 'gamification-core-style';
  const DASHBOARD_SELECTOR = '#start .v40c3-home-dashboard';

  const RPC = Object.freeze({
    xp:'get_student_gamification_v571a',
    achievements:'get_student_gamification_achievements_v571b',
    missions:'get_student_weekly_missions_v572',
    classChallengeV573:'get_student_class_challenge_v573',
    teacherV573:'get_teacher_class_gamification_v573',
    classChallengeV574:'get_student_class_challenge_v574',
    teacherV574:'get_teacher_class_gamification_v574',
    updateChallengeV574:'update_teacher_class_challenge_v574'
  });

  const IDS = Object.freeze({
    xpCard:'v571a-gamification-card',
    achievementCard:'v571b-latest-achievement',
    achievementToast:'v571b-achievement-toast',
    missionsCard:'v572-weekly-missions-card',
    missionsToast:'v572-weekly-missions-toast',
    legacyClassChallengeCard:'v573-class-challenge-card',
    classChallengeCard:'v574-class-challenge-card',
    classChallengeToast:'v574-class-challenge-toast',
    teacherTrigger:'v573-open-class-motivation',
    teacherOverlay:'v573-class-motivation-overlay',
    teacherClass:'v573-teacher-class',
    teacherContent:'v573-teacher-content',
    settingsTrigger:'v574-class-challenge-settings',
    settingsOverlay:'v574-class-challenge-settings-overlay',
    settingsClass:'v574-settings-class',
    settingsContent:'v574-settings-content'
  });

  const LEVELS = Object.freeze([
    Object.freeze({number:1,title:'Maths Starter',start:0,next:100}),
    Object.freeze({number:2,title:'Number Explorer',start:100,next:250}),
    Object.freeze({number:3,title:'Problem Solver',start:250,next:500}),
    Object.freeze({number:4,title:'Maths Challenger',start:500,next:900}),
    Object.freeze({number:5,title:'Maths Master',start:900,next:null})
  ]);

  const trim = value => String(value ?? '').trim();
  const html = value => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  const integer = value => Math.max(0,Math.round(Number(value)||0));
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

  function signedIn(){
    if (typeof document === 'undefined') return false;
    return !!document.querySelector('#start .v40c-session-panel.v40c-authenticated');
  }

  function dashboard(){
    return typeof document === 'undefined' ? null : document.querySelector(DASHBOARD_SELECTOR);
  }

  function passivePracticeAccess(){
    if (!signedIn()) return null;
    try {
      const fromHome = ROOT.V57CStudentContinueLearningHome?.passivePracticeAccess?.();
      if (fromHome?.access_token) return fromHome;
      const fromResume = ROOT.V57ACrossDevicePastPaperResume?.passivePracticeAccess?.();
      if (fromResume?.access_token) return fromResume;
      const access = typeof activeStudentAccess !== 'undefined' ? activeStudentAccess : ROOT.activeStudentAccess;
      if (!access?.access_token) return null;
      if (access.purpose && access.purpose !== 'practice') return null;
      return access;
    } catch { return null; }
  }

  function createCache(ttlMs=CACHE_MS){
    let value = null;
    let loadedAt = 0;
    return Object.freeze({
      get(force=false){
        if (!value) return null;
        if (!force && loadedAt && Date.now()-loadedAt<ttlMs) return value;
        return force ? value : null;
      },
      peek(){ return value; },
      set(next){ value=next; loadedAt=Date.now(); return value; },
      clear(){ value=null; loadedAt=0; },
      isFresh(){ return !!value && !!loadedAt && Date.now()-loadedAt<ttlMs; },
      loadedAt(){ return loadedAt; }
    });
  }

  function levelForXp(value){
    const xp = integer(value);
    const level = [...LEVELS].reverse().find(row => xp >= row.start) || LEVELS[0];
    const progress = level.next == null
      ? 100
      : clamp(Math.round(100 * (xp-level.start) / Math.max(1,level.next-level.start)),0,100);
    return Object.freeze({
      number:level.number,
      title:level.title,
      start_xp:level.start,
      next_level_xp:level.next,
      progress_percent:progress
    });
  }

  function normalizeXpPayload(payload){
    const xp = integer(payload?.xp?.total);
    const fallback = levelForXp(xp);
    const serverLevel = integer(payload?.level?.number);
    const known = LEVELS.find(row => row.number===serverLevel);
    const level = known ? {
      number:known.number,
      title:trim(payload?.level?.title) || known.title,
      start_xp:Number.isFinite(Number(payload?.level?.start_xp)) ? integer(payload.level.start_xp) : known.start,
      next_level_xp:payload?.level?.next_level_xp == null ? null : integer(payload.level.next_level_xp),
      progress_percent:clamp(integer(payload?.level?.progress_percent),0,100)
    } : fallback;
    return Object.freeze({
      xp,
      level:Object.freeze(level),
      activity:Object.freeze({
        first_try_correct:integer(payload?.activity?.first_try_correct),
        second_try_correct:integer(payload?.activity?.second_try_correct),
        completed_sessions:integer(payload?.activity?.completed_sessions),
        completed_past_papers:integer(payload?.activity?.completed_past_papers),
        completed_assignments:integer(payload?.activity?.completed_assignments)
      }),
      rules:Object.freeze({
        first_try_correct_xp:integer(payload?.rules?.first_try_correct_xp || 10),
        second_try_correct_xp:integer(payload?.rules?.second_try_correct_xp || 6),
        completed_session_xp:integer(payload?.rules?.completed_session_xp || 10),
        past_paper_extra_xp:integer(payload?.rules?.past_paper_extra_xp || 20),
        completed_assignment_xp:integer(payload?.rules?.completed_assignment_xp || 20)
      })
    });
  }

  function normalizeBadge(row){
    if (!row || !trim(row.id)) return null;
    const earnedAt = row.earned_at ? trim(row.earned_at) : '';
    return Object.freeze({
      id:trim(row.id),
      title:trim(row.title) || 'Achievement',
      description:trim(row.description),
      icon:trim(row.icon) || '🏅',
      earned:row.earned===true || !!earnedAt,
      earned_at:earnedAt || null
    });
  }

  function normalizeAchievementsPayload(payload){
    const badges=(Array.isArray(payload?.badges)?payload.badges:[]).map(normalizeBadge).filter(Boolean);
    const earned=badges.filter(row=>row.earned);
    const latest=normalizeBadge(payload?.latest_badge) || earned
      .slice()
      .sort((a,b)=>Date.parse(b.earned_at||0)-Date.parse(a.earned_at||0))[0] || null;
    return Object.freeze({
      streak:Object.freeze({
        current:integer(payload?.streak?.current),
        longest:integer(payload?.streak?.longest),
        days_this_week:integer(payload?.streak?.days_this_week),
        meaningful_days:integer(payload?.streak?.meaningful_days),
        today_qualified:payload?.streak?.today_qualified===true,
        today_questions:integer(payload?.streak?.today_questions),
        last_qualified_day:trim(payload?.streak?.last_qualified_day) || null
      }),
      badges:Object.freeze(badges),
      latest_badge:latest,
      earned_count:earned.length,
      rules:Object.freeze({
        meaningful_questions_per_day:Math.max(1,integer(payload?.rules?.meaningful_questions_per_day || 5)),
        past_paper_completes_day:payload?.rules?.past_paper_completes_day!==false,
        assignment_completes_day:payload?.rules?.assignment_completes_day!==false,
        timezone:trim(payload?.rules?.timezone) || 'Asia/Brunei'
      })
    });
  }

  function normalizeMission(row){
    const target=Math.max(1,integer(row?.target || 1));
    const raw=integer(row?.raw_progress ?? row?.progress);
    const progress=Math.min(target,integer(row?.progress ?? raw));
    return Object.freeze({
      id:trim(row?.id) || 'mission',
      title:trim(row?.title) || 'Weekly Mission',
      description:trim(row?.description),
      icon:trim(row?.icon) || '⭐',
      progress,
      raw_progress:raw,
      target,
      unit:trim(row?.unit) || 'step',
      complete:row?.complete===true || raw>=target,
      action:trim(row?.action) || 'learn',
      assignment_completions:integer(row?.assignment_completions),
      past_paper_completions:integer(row?.past_paper_completions)
    });
  }

  function normalizeMissionsPayload(payload){
    const missions=(Array.isArray(payload?.missions)?payload.missions:[]).map(normalizeMission);
    const completed=missions.filter(row=>row.complete).length;
    const total=missions.length || integer(payload?.summary?.total || 3);
    return Object.freeze({
      week:Object.freeze({
        start_date:trim(payload?.week?.start_date) || null,
        end_date:trim(payload?.week?.end_date) || null,
        today:trim(payload?.week?.today) || null,
        timezone:trim(payload?.week?.timezone) || 'Asia/Brunei'
      }),
      summary:Object.freeze({
        completed,
        total,
        all_complete:total>0 && completed>=total
      }),
      missions:Object.freeze(missions),
      rules:Object.freeze({
        question_target:Math.max(1,integer(payload?.rules?.question_target || 10)),
        practice_day_target:Math.max(1,integer(payload?.rules?.practice_day_target || 2)),
        meaningful_questions_per_day:Math.max(1,integer(payload?.rules?.meaningful_questions_per_day || 5)),
        challenge_target:Math.max(1,integer(payload?.rules?.challenge_target || 1)),
        week_starts:trim(payload?.rules?.week_starts) || 'Monday',
        timezone:trim(payload?.rules?.timezone) || 'Asia/Brunei',
        exam_activity_counts:payload?.rules?.exam_activity_counts===true
      })
    });
  }

  function normalizeClassChallengeV573(payload){
    const activeStudents=integer(payload?.class?.active_students ?? payload?.challenge?.active_students);
    const questions=integer(payload?.challenge?.questions_completed);
    const target=Math.max(1,integer(payload?.challenge?.target_questions || Math.max(10,activeStudents*10)));
    const contributors=integer(payload?.challenge?.contributors);
    const percent=clamp(integer(payload?.challenge?.progress_percent ?? Math.round(100*questions/target)),0,100);
    return Object.freeze({
      class:Object.freeze({
        class_id:trim(payload?.class?.class_id),
        class_name:trim(payload?.class?.class_name) || 'Your class',
        year_level:integer(payload?.class?.year_level),
        active_students:activeStudents
      }),
      week:Object.freeze({
        start_date:trim(payload?.week?.start_date) || null,
        end_date:trim(payload?.week?.end_date) || null,
        today:trim(payload?.week?.today) || null,
        timezone:trim(payload?.week?.timezone) || 'Asia/Brunei'
      }),
      challenge:Object.freeze({
        title:trim(payload?.challenge?.title) || 'Class Question Quest',
        description:trim(payload?.challenge?.description) || 'Work together to complete Practice questions this week.',
        questions_completed:questions,
        target_questions:target,
        contributors,
        progress_percent:percent,
        complete:payload?.challenge?.complete===true || questions>=target
      }),
      rules:Object.freeze({
        questions_per_active_student:Math.max(1,integer(payload?.rules?.questions_per_active_student || 10)),
        week_starts:trim(payload?.rules?.week_starts) || 'Monday',
        timezone:trim(payload?.rules?.timezone) || 'Asia/Brunei',
        exam_activity_counts:payload?.rules?.exam_activity_counts===true,
        student_rankings:payload?.rules?.student_rankings===true
      })
    });
  }

  function normalizeTeacherStudent(row){
    return Object.freeze({
      roster_student_id:trim(row?.roster_student_id),
      student_id:trim(row?.student_id),
      student_name:trim(row?.student_name) || 'Student',
      xp_total:integer(row?.xp_total),
      level_number:Math.max(1,integer(row?.level_number || 1)),
      level_title:trim(row?.level_title) || 'Maths Starter',
      current_streak:integer(row?.current_streak),
      weekly_questions:integer(row?.weekly_questions),
      weekly_practice_days:integer(row?.weekly_practice_days),
      weekly_challenges:integer(row?.weekly_challenges),
      missions_completed:clamp(integer(row?.missions_completed),0,3),
      all_missions_complete:row?.all_missions_complete===true || integer(row?.missions_completed)>=3
    });
  }

  function normalizeTeacherPayload(payload){
    const challenge=normalizeClassChallengeV573(payload);
    const students=(Array.isArray(payload?.students)?payload.students:[]).map(normalizeTeacherStudent)
      .sort((a,b)=>a.student_name.localeCompare(b.student_name,undefined,{numeric:true,sensitivity:'base'}) || a.student_id.localeCompare(b.student_id,undefined,{numeric:true,sensitivity:'base'}));
    const summary=payload?.summary || {};
    return Object.freeze({
      class:challenge.class,
      week:challenge.week,
      challenge:challenge.challenge,
      summary:Object.freeze({
        active_students:integer(summary.active_students ?? students.length),
        active_this_week:integer(summary.active_this_week),
        all_missions_complete:integer(summary.all_missions_complete),
        active_streaks:integer(summary.active_streaks),
        average_xp:integer(summary.average_xp),
        level_distribution:Object.freeze({...summary.level_distribution})
      }),
      students:Object.freeze(students),
      rules:challenge.rules
    });
  }

  function normalizeClassChallengeV574(payload){
    const active=integer(payload?.class?.active_students ?? payload?.summary?.active_students);
    const questions=integer(payload?.challenge?.questions_completed);
    const perStudent=Math.max(1,integer(payload?.settings?.questions_per_active_student ?? payload?.rules?.questions_per_active_student ?? 10));
    const target=Math.max(1,integer(payload?.challenge?.target_questions || active*perStudent || 10));
    const percent=clamp(integer(payload?.challenge?.progress_percent ?? Math.round(100*questions/target)),0,100);
    const enabled=payload?.challenge?.enabled!==false && payload?.settings?.challenge_enabled!==false;
    return Object.freeze({
      class:Object.freeze({
        class_id:trim(payload?.class?.class_id),
        class_name:trim(payload?.class?.class_name)||'Your class',
        year_level:integer(payload?.class?.year_level),
        active_students:active
      }),
      week:Object.freeze({
        start_date:trim(payload?.week?.start_date)||null,
        end_date:trim(payload?.week?.end_date)||null,
        today:trim(payload?.week?.today)||null,
        timezone:trim(payload?.week?.timezone)||'Asia/Brunei'
      }),
      challenge:Object.freeze({
        enabled,
        questions_completed:questions,
        target_questions:target,
        contributors:integer(payload?.challenge?.contributors),
        progress_percent:percent,
        complete:enabled && (payload?.challenge?.complete===true || questions>=target)
      }),
      settings:Object.freeze({
        challenge_enabled:enabled,
        questions_per_active_student:perStudent,
        allowed:Object.freeze((Array.isArray(payload?.settings?.allowed_questions_per_active_student)?payload.settings.allowed_questions_per_active_student:[5,10,15,20]).map(integer).filter(Boolean)),
        updated_at:trim(payload?.settings?.updated_at)||null
      })
    });
  }

  function phaseLabel(model){
    if (!model?.challenge?.enabled) return 'Paused';
    if (model.challenge.complete) return 'Challenge complete';
    const pct=integer(model.challenge.progress_percent);
    if (pct>=75) return 'Final push';
    if (pct>=50) return 'Halfway there';
    if (pct>=25) return 'Building momentum';
    return 'Getting started';
  }

  function dateLabel(value){
    if (!value) return '';
    const text=trim(value);
    const date=/^\d{4}-\d{2}-\d{2}$/.test(text)
      ? new Date(`${text}T12:00:00+08:00`)
      : new Date(text);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString([],{day:'numeric',month:'short'});
  }

  function weekLabel(model){
    const start=dateLabel(model?.week?.start_date);
    const end=dateLabel(model?.week?.end_date);
    return start && end ? `${start} – ${end}` : 'This week';
  }

  function injectStyles(){
    if (typeof document==='undefined' || document.getElementById(STYLE_ID)) return false;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #start #${IDS.xpCard}{border:1px solid color-mix(in srgb,#18a999 38%,var(--border));border-radius:20px;padding:16px 18px;background:linear-gradient(135deg,color-mix(in srgb,#e8fbf7 78%,var(--card)),var(--card));display:grid;grid-template-columns:auto minmax(0,1fr);gap:15px;align-items:center;box-shadow:0 7px 22px rgba(15,85,80,.06)}
      #start .v571a-level-badge{width:68px;height:68px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(145deg,#20b7a5,#0d7f86);color:white;box-shadow:inset 0 0 0 4px rgba(255,255,255,.2),0 7px 15px rgba(12,107,111,.18);font-size:29px;font-weight:950;position:relative}
      #start .v571a-level-badge::after{content:'★';position:absolute;right:-6px;bottom:-6px;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#ffc342;color:#704500;font-size:13px;border:3px solid var(--card)}
      #start .v571a-level-main{min-width:0;display:grid;gap:7px}
      #start .v571a-level-head{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
      #start .v571a-level-kicker{font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.07em;color:#087a75}
      #start .v571a-level-title{margin:1px 0 0;font-size:clamp(17px,2.5vw,22px);line-height:1.25}
      #start .v571a-xp-label{font-size:13px;font-weight:900;white-space:nowrap;color:var(--text)}
      #start .v571a-progress{height:11px;border-radius:999px;background:color-mix(in srgb,var(--border) 72%,transparent);overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.06)}
      #start .v571a-progress>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#16b7a3,#36cdb3);transition:width .35s ease}
      #start .v571a-level-note{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:11px;line-height:1.4}
      #start .v571a-level-note strong{color:#087a75}
      #start .v571a-rules{font-size:11px;color:var(--muted)}
      #start .v571a-rules summary{cursor:pointer;font-weight:850;color:var(--primary);width:max-content;max-width:100%;list-style:none}
      #start .v571a-rules summary::-webkit-details-marker{display:none}
      #start .v571a-rule-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      #start .v571a-rule-chips span{display:inline-flex;padding:5px 8px;border-radius:999px;border:1px solid var(--border);background:var(--card);font-size:10px;font-weight:800}
      html[data-theme="dark"] #start #${IDS.xpCard}{background:linear-gradient(135deg,color-mix(in srgb,#0c6f69 18%,var(--card)),var(--card))}
      @media(max-width:520px){#start #${IDS.xpCard}{grid-template-columns:56px minmax(0,1fr);padding:14px;gap:12px}#start .v571a-level-badge{width:56px;height:56px;border-radius:17px;font-size:24px}#start .v571a-xp-label{white-space:normal}}

      #start .v571b-streak-chip{display:inline-flex;align-items:center;gap:6px;min-height:31px;padding:5px 9px;border-radius:999px;border:1px solid color-mix(in srgb,#ff8a24 42%,var(--border));background:color-mix(in srgb,#fff1df 72%,var(--card));color:#b45608;font-size:11px;font-weight:950;white-space:nowrap}
      #start .v571b-streak-note{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:8px 10px;border-radius:12px;background:color-mix(in srgb,#fff3e4 60%,var(--card));border:1px solid color-mix(in srgb,#ff9a35 24%,var(--border));font-size:11px;line-height:1.4;color:var(--muted)}
      #start .v571b-streak-note strong{color:#a94f08}
      #start #${IDS.achievementCard}{border:1px solid color-mix(in srgb,#20a875 34%,var(--border));border-radius:18px;padding:15px 16px;background:linear-gradient(135deg,color-mix(in srgb,#ebfbf3 72%,var(--card)),var(--card));display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center}
      #start .v571b-achievement-icon{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(145deg,#25b67e,#168969);font-size:29px;box-shadow:inset 0 0 0 3px rgba(255,255,255,.18)}
      #start .v571b-achievement-main{min-width:0;display:grid;gap:4px}
      #start .v571b-kicker{font-size:10px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;color:#16805d}
      #start .v571b-achievement-main h3{margin:0;font-size:18px;line-height:1.25}
      #start .v571b-achievement-main p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}
      #start .v571b-achievement-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:3px}
      #start .v571b-achievement-meta span{font-size:10px;font-weight:850;padding:4px 7px;border-radius:999px;border:1px solid var(--border);background:var(--card)}
      #start .v571b-achievements{grid-column:1/-1;border-top:1px solid var(--border);padding-top:9px;margin-top:2px}
      #start .v571b-achievements summary{cursor:pointer;font-size:11px;font-weight:900;color:var(--primary);list-style:none;width:max-content;max-width:100%}
      #start .v571b-achievements summary::-webkit-details-marker{display:none}
      #start .v571b-badge-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}
      #start .v571b-badge{border:1px solid var(--border);border-radius:13px;padding:9px;background:var(--card);display:grid;gap:4px;min-width:0}
      #start .v571b-badge.locked{opacity:.58}
      #start .v571b-badge-icon{font-size:21px}
      #start .v571b-badge strong{font-size:11px;line-height:1.25}
      #start .v571b-badge small{font-size:9px;color:var(--muted);line-height:1.35}
      #${IDS.achievementToast}{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(330px,calc(100vw - 36px));border:1px solid rgba(32,168,117,.38);border-radius:18px;padding:14px 15px;background:var(--card,#fff);box-shadow:0 18px 45px rgba(0,0,0,.18);display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;animation:v571b-pop .28s ease-out}
      #${IDS.achievementToast} .v571b-toast-icon{font-size:31px} #${IDS.achievementToast} strong{display:block;font-size:13px} #${IDS.achievementToast} span{display:block;font-size:11px;color:var(--muted);margin-top:2px}
      @keyframes v571b-pop{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
      html[data-theme="dark"] #start .v571b-streak-chip,html[data-theme="dark"] #start .v571b-streak-note{background:color-mix(in srgb,#8c4a13 18%,var(--card))}
      html[data-theme="dark"] #start #${IDS.achievementCard}{background:linear-gradient(135deg,color-mix(in srgb,#167354 16%,var(--card)),var(--card))}
      @media(max-width:760px){#start .v571b-badge-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){#start #${IDS.achievementCard}{grid-template-columns:48px minmax(0,1fr);padding:13px}#start .v571b-achievement-icon{width:48px;height:48px;border-radius:15px;font-size:24px}#start .v571b-badge-grid{grid-template-columns:1fr 1fr}}
      @media(prefers-reduced-motion:reduce){#${IDS.achievementToast}{animation:none}}

      #start #${IDS.missionsCard}{border:1px solid color-mix(in srgb,#5f63dc 30%,var(--border));border-radius:19px;padding:15px 16px;background:linear-gradient(135deg,color-mix(in srgb,#f1f1ff 70%,var(--card)),var(--card));display:grid;gap:12px}
      #start .v572-mission-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      #start .v572-kicker{font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.06em;color:#5257c6}
      #start .v572-mission-head h3{margin:2px 0 0;font-size:19px;line-height:1.25}
      #start .v572-week-meta{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
      #start .v572-week-meta span{font-size:10px;font-weight:850;padding:5px 8px;border-radius:999px;border:1px solid var(--border);background:var(--card)}
      #start .v572-overall{color:#5257c6!important;border-color:color-mix(in srgb,#5f63dc 35%,var(--border))!important}
      #start .v572-mission-list{display:grid;gap:8px}
      #start .v572-mission{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 11px;border:1px solid var(--border);border-radius:14px;background:var(--card)}
      #start .v572-mission.complete{border-color:color-mix(in srgb,#25a875 35%,var(--border));background:color-mix(in srgb,#ecfbf4 45%,var(--card))}
      #start .v572-mission-icon{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,#edeefe 70%,var(--card));font-size:20px}
      #start .v572-mission.complete .v572-mission-icon{background:color-mix(in srgb,#dbf7e9 72%,var(--card))}
      #start .v572-mission-main{min-width:0;display:grid;gap:5px}
      #start .v572-mission-title{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      #start .v572-mission-title strong{font-size:12px}
      #start .v572-check{font-size:10px;font-weight:950;color:#16805d}
      #start .v572-mission-main p{margin:0;font-size:10px;line-height:1.4;color:var(--muted)}
      #start .v572-mini-progress{height:7px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--border) 72%,transparent)}
      #start .v572-mini-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#6268df,#8388ef);transition:width .3s ease}
      #start .v572-mission.complete .v572-mini-progress span{background:linear-gradient(90deg,#20a875,#3dc58f)}
      #start .v572-progress-text{font-size:10px;font-weight:900;white-space:nowrap;color:var(--muted)}
      #start .v572-mission-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:10px}
      #start .v572-mission-footer p{margin:0;font-size:10px;color:var(--muted);line-height:1.4}
      #start .v572-actions{display:flex;gap:7px;flex-wrap:wrap}
      #start .v572-actions button{border:1px solid var(--border);border-radius:10px;padding:7px 10px;background:var(--card);color:var(--text);font:inherit;font-size:10px;font-weight:900;cursor:pointer}
      #start .v572-actions button.primary{background:var(--primary);border-color:var(--primary);color:white}
      #${IDS.missionsToast}{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(330px,calc(100vw - 36px));border:1px solid rgba(95,99,220,.35);border-radius:18px;padding:14px 15px;background:var(--card,#fff);box-shadow:0 18px 45px rgba(0,0,0,.18);display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;animation:v572-pop .28s ease-out}
      #${IDS.missionsToast} .v572-toast-icon{font-size:31px} #${IDS.missionsToast} strong{display:block;font-size:13px} #${IDS.missionsToast} span{display:block;font-size:11px;color:var(--muted);margin-top:2px}
      @keyframes v572-pop{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
      html[data-theme="dark"] #start #${IDS.missionsCard}{background:linear-gradient(135deg,color-mix(in srgb,#585fcf 14%,var(--card)),var(--card))}
      html[data-theme="dark"] #start .v572-mission.complete{background:color-mix(in srgb,#16805d 13%,var(--card))}
      @media(max-width:560px){#start .v572-mission{grid-template-columns:34px minmax(0,1fr);gap:9px}#start .v572-mission-icon{width:34px;height:34px}.v572-progress-text{grid-column:2;justify-self:start}#start .v572-week-meta{justify-content:flex-start}}
      @media(prefers-reduced-motion:reduce){#${IDS.missionsToast}{animation:none}}

      html.v574-class-challenge-ready #start #${IDS.legacyClassChallengeCard}{display:none!important}
      #start #${IDS.classChallengeCard}{border:1px solid color-mix(in srgb,#0d9a91 38%,var(--border));border-radius:20px;padding:16px;background:linear-gradient(135deg,color-mix(in srgb,#e7fbf8 72%,var(--card)),var(--card));display:grid;gap:12px;box-shadow:0 8px 24px rgba(20,120,115,.06)}
      #start .v574-challenge-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      #start .v574-kicker{font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.065em;color:#087e77}
      #start .v574-challenge-head h3{margin:2px 0 3px;font-size:19px;line-height:1.25}
      #start .v574-challenge-head p{margin:0;font-size:10px;color:var(--muted);line-height:1.45}
      #start .v574-week{font-size:10px;font-weight:850;border:1px solid var(--border);border-radius:999px;padding:5px 8px;background:var(--card)}
      #start .v574-progress-head{display:flex;justify-content:space-between;gap:8px;align-items:end;flex-wrap:wrap}
      #start .v574-progress-head strong{font-size:14px}#start .v574-phase{font-size:10px;font-weight:950;color:#087e77;text-transform:uppercase;letter-spacing:.04em}
      #start .v574-bar{height:11px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--border) 72%,transparent)}
      #start .v574-bar span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#109a92,#3ac5a8);transition:width .3s ease}
      #start .v574-milestones{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;font-size:9px;color:var(--muted);text-align:center}
      #start .v574-milestones span:first-child{text-align:left}#start .v574-milestones span:last-child{text-align:right}
      #start .v574-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:10px}
      #start .v574-foot p{margin:0;font-size:10px;color:var(--muted);line-height:1.45;max-width:70ch}
      #start .v574-foot button{border:1px solid var(--primary);border-radius:10px;padding:8px 11px;background:var(--primary);color:#fff;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
      html[data-theme="dark"] #start #${IDS.classChallengeCard}{background:linear-gradient(135deg,color-mix(in srgb,#15968d 14%,var(--card)),var(--card))}
      #${IDS.classChallengeToast}{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(340px,calc(100vw - 36px));border:1px solid rgba(16,154,146,.35);border-radius:18px;padding:14px 15px;background:var(--card,#fff);box-shadow:0 18px 45px rgba(0,0,0,.18);display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center}
      #${IDS.classChallengeToast} .v574-toast-icon{font-size:32px}#${IDS.classChallengeToast} strong{display:block;font-size:13px}#${IDS.classChallengeToast} span{display:block;font-size:11px;color:var(--muted);margin-top:2px}

      #${IDS.teacherTrigger}{white-space:nowrap}
      #${IDS.teacherOverlay}{position:fixed;inset:0;z-index:128;background:rgba(15,23,42,.72);overflow:auto;padding:18px}
      #${IDS.teacherOverlay}.hidden{display:none!important}
      #${IDS.teacherOverlay} .v573-sheet{width:min(1180px,100%);margin:0 auto;background:var(--card);color:var(--text);border-radius:20px;box-shadow:0 28px 90px rgba(0,0,0,.28);padding:22px}
      #${IDS.teacherOverlay} .v573-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}
      #${IDS.teacherOverlay} .v573-head h2{margin:0 0 4px;font-size:24px}
      #${IDS.teacherOverlay} .v573-head p{margin:0;color:var(--muted);font-size:12px;line-height:1.45}
      #${IDS.teacherOverlay} .v573-head-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      #${IDS.teacherOverlay} .v573-controls{display:grid;grid-template-columns:minmax(210px,.8fr) auto;gap:10px;align-items:end;margin:16px 0}
      #${IDS.teacherOverlay} .v573-controls label{margin:0}
      #${IDS.teacherOverlay} .v573-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:12px 0}
      #${IDS.teacherOverlay} .v573-stat{border:1px solid var(--border);border-radius:13px;padding:11px;background:color-mix(in srgb,var(--soft) 18%,var(--card))}
      #${IDS.teacherOverlay} .v573-stat strong{display:block;font-size:21px;margin-bottom:3px}
      #${IDS.teacherOverlay} .v573-stat span{font-size:10px;color:var(--muted);line-height:1.3}
      #${IDS.teacherOverlay} .v573-class-challenge{border:1px solid color-mix(in srgb,#14a0a8 35%,var(--border));border-radius:15px;padding:13px 14px;background:color-mix(in srgb,#e9fbfb 45%,var(--card));display:grid;gap:8px}
      #${IDS.teacherOverlay} .v573-class-challenge-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}
      #${IDS.teacherOverlay} .v573-class-challenge h3{margin:0;font-size:16px}
      #${IDS.teacherOverlay} .v573-class-challenge p{margin:0;color:var(--muted);font-size:10px}
      #${IDS.teacherOverlay} .v573-bar{height:10px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--border) 72%,transparent)}
      #${IDS.teacherOverlay} .v573-bar>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#16a0a8,#36c0a8);transition:width .3s ease}
      #${IDS.teacherOverlay} .v573-filters{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0 8px}
      #${IDS.teacherOverlay} .v573-filter{min-height:34px;padding:6px 10px;font-size:11px;border:1px solid var(--border);background:var(--card)}
      #${IDS.teacherOverlay} .v573-filter[aria-pressed="true"]{border-color:var(--primary);color:var(--primary);background:color-mix(in srgb,var(--soft) 40%,var(--card))}
      #${IDS.teacherOverlay} .v573-tablewrap{overflow:auto;border:1px solid var(--border);border-radius:13px}
      #${IDS.teacherOverlay} table{width:100%;border-collapse:collapse;background:var(--card)}
      #${IDS.teacherOverlay} th,#${IDS.teacherOverlay} td{padding:9px 10px;border-bottom:1px solid var(--border);text-align:left;vertical-align:middle;font-size:11px;white-space:nowrap}
      #${IDS.teacherOverlay} th{background:color-mix(in srgb,var(--soft) 35%,var(--card));color:var(--muted);font-size:10px}
      #${IDS.teacherOverlay} td.v573-name{white-space:normal;min-width:170px}
      #${IDS.teacherOverlay} tr.v573-nudge td{background:color-mix(in srgb,#fff7e8 35%,var(--card))}
      #${IDS.teacherOverlay} .v573-pill{display:inline-block;padding:3px 7px;border:1px solid var(--border);border-radius:999px;font-size:9px;font-weight:900}
      #${IDS.teacherOverlay} .v573-mission-ok{color:#147a58;border-color:color-mix(in srgb,#25a875 35%,var(--border))}
      #${IDS.teacherOverlay} .v573-empty,#${IDS.teacherOverlay} .v573-loading{padding:22px;text-align:center;color:var(--muted);font-size:12px}
      #${IDS.teacherOverlay} .v573-note{margin:9px 0 0;color:var(--muted);font-size:10px;line-height:1.45}
      #${IDS.teacherOverlay} .v574-managed-note{margin-top:7px;padding:7px 9px;border:1px solid color-mix(in srgb,#0d9a91 28%,var(--border));border-radius:10px;font-size:10px;color:var(--muted)}
      html[data-theme="dark"] #${IDS.teacherOverlay} .v573-class-challenge{background:color-mix(in srgb,#15969d 12%,var(--card))}
      @media(max-width:900px){#${IDS.teacherOverlay} .v573-summary{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:650px){#${IDS.teacherOverlay}{padding:8px}#${IDS.teacherOverlay} .v573-sheet{padding:15px;border-radius:16px}#${IDS.teacherOverlay} .v573-controls{grid-template-columns:1fr}#${IDS.teacherOverlay} .v573-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}

      #${IDS.settingsTrigger}{white-space:nowrap}
      #${IDS.settingsOverlay}{position:fixed;inset:0;z-index:131;background:rgba(15,23,42,.72);overflow:auto;padding:18px}
      #${IDS.settingsOverlay}.hidden{display:none!important}
      #${IDS.settingsOverlay} .v574-sheet{width:min(760px,100%);margin:0 auto;background:var(--card);color:var(--text);border-radius:20px;box-shadow:0 28px 90px rgba(0,0,0,.28);padding:22px}
      #${IDS.settingsOverlay} .v574-settings-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      #${IDS.settingsOverlay} .v574-settings-head h2{margin:0 0 4px;font-size:23px}
      #${IDS.settingsOverlay} .v574-settings-head p{margin:0;font-size:11px;color:var(--muted);line-height:1.45}
      #${IDS.settingsOverlay} .v574-settings-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
      #${IDS.settingsOverlay} .v574-controls{display:grid;grid-template-columns:minmax(200px,1fr) auto;gap:10px;align-items:end;margin:16px 0}
      #${IDS.settingsOverlay} .v574-settings-card{border:1px solid var(--border);border-radius:16px;padding:14px;display:grid;gap:12px;background:color-mix(in srgb,var(--soft) 18%,var(--card))}
      #${IDS.settingsOverlay} .v574-toggle-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--border)}
      #${IDS.settingsOverlay} .v574-toggle-copy strong{display:block;font-size:13px}#${IDS.settingsOverlay} .v574-toggle-copy span{display:block;font-size:10px;color:var(--muted);margin-top:3px}
      #${IDS.settingsOverlay} .v574-toggle{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:900}
      #${IDS.settingsOverlay} .v574-target-grid{display:grid;grid-template-columns:minmax(210px,1fr) minmax(180px,.7fr);gap:12px;align-items:end}
      #${IDS.settingsOverlay} .v574-preview{border:1px solid color-mix(in srgb,#0d9a91 35%,var(--border));border-radius:14px;padding:12px;background:color-mix(in srgb,#e7fbf8 48%,var(--card));display:grid;gap:6px}
      #${IDS.settingsOverlay} .v574-preview strong{font-size:20px}#${IDS.settingsOverlay} .v574-preview span{font-size:10px;color:var(--muted)}
      #${IDS.settingsOverlay} .v574-save-row{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
      #${IDS.settingsOverlay} .v574-message{font-size:11px;color:var(--muted);min-height:16px}
      #${IDS.settingsOverlay} .v574-message.ok{color:#16805d;font-weight:850}#${IDS.settingsOverlay} .v574-message.err{color:#b42318;font-weight:850}
      @media(max-width:620px){#${IDS.settingsOverlay}{padding:8px}#${IDS.settingsOverlay} .v574-sheet{padding:15px;border-radius:16px}#${IDS.settingsOverlay} .v574-controls,#${IDS.settingsOverlay} .v574-target-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
    return true;
  }

  const api=Object.freeze({
    CACHE_MS,STYLE_ID,DASHBOARD_SELECTOR,RPC,IDS,LEVELS,
    trim,html,integer,clamp,signedIn,dashboard,passivePracticeAccess,createCache,
    levelForXp,normalizeXpPayload,normalizeBadge,normalizeAchievementsPayload,
    normalizeMission,normalizeMissionsPayload,normalizeClassChallengeV573,
    normalizeTeacherStudent,normalizeTeacherPayload,normalizeClassChallengeV574,
    phaseLabel,dateLabel,weekLabel,injectStyles
  });

  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  if (typeof window !== 'undefined'){
    Object.defineProperty(window,'GamificationCore',{value:api,writable:false,configurable:false});
  }
})();
