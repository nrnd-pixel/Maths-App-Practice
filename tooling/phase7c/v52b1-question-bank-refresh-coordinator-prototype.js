/* Phase 7C-C — dormant Question Bank refresh coordinator prototype.
   Tooling-only: never loaded by production. Proves an explicit refresh contract can replace
   suppressed Question Bank observer responsibilities without changing runtime ownership. */
(function installPhase7CQuestionBankRefreshCoordinatorPrototype(ROOT){
  'use strict';

  if (!ROOT || ROOT.Phase7CQuestionBankRefreshCoordinatorPrototype) return;

  const CARD_REFRESH_ORDER = Object.freeze([
    'bulk-status',
    'qa',
    'review',
    'topical-library',
    'topical-activation',
    'multipart',
    'correction-history'
  ]);

  const SELECTION_REFRESH_ORDER = Object.freeze([
    'bulk-status',
    'topical-activation',
    'review',
    'multipart',
    'correction-history'
  ]);

  function callable(value){
    return typeof value === 'function';
  }

  function bound(object,key){
    const fn = object?.[key];
    return callable(fn) ? fn.bind(object) : null;
  }

  function explicitHistoryLifecycle(options){
    if (callable(options?.historyLifecycle)) return options.historyLifecycle;
    const history = ROOT.V51QuestionChangeHistory;
    if (callable(history?.refreshLifecycle)) return history.refreshLifecycle.bind(history);
    return null;
  }

  function inspectContracts(options = {}){
    const contracts = Object.freeze({
      bulkStatus: callable(ROOT.V51QuestionBankBulkStatus?.renderSummary),
      qa: callable(ROOT.V51QuestionBankQA?.render),
      review: callable(ROOT.V51QuestionReviewWorkflow?.renderAll),
      topicalLibrary: callable(ROOT.V52TeacherTopicalLibrary?.render),
      topicalActivation: callable(ROOT.V52TopicalActivationGuard?.decorate),
      multipart: callable(ROOT.V51MultipartQuestionManagement?.renderGroup),
      correctionHistory: !!explicitHistoryLifecycle(options)
    });

    return Object.freeze({
      contracts,
      readyForGateRetirement: Object.values(contracts).every(Boolean),
      blocker: contracts.correctionHistory ? '' : 'missing-explicit-correction-history-refreshLifecycle'
    });
  }

  function record(results, kind, callback){
    if (!callable(callback)){
      results.push(Object.freeze({kind,status:'missing'}));
      return;
    }
    try {
      const value = callback();
      results.push(Object.freeze({kind,status:'called',value}));
    } catch (error){
      results.push(Object.freeze({kind,status:'error',error:String(error?.message || error)}));
    }
  }

  function blockedHistory(results){
    results.push(Object.freeze({
      kind:'correction-history',
      status:'blocked',
      reason:'missing-explicit-correction-history-refreshLifecycle'
    }));
  }

  function result(phase, results, options){
    const inspection = inspectContracts(options);
    const failed = results.find(item=>item.status !== 'called') || null;
    return Object.freeze({
      phase,
      order:Object.freeze(results.map(item=>item.kind)),
      results:Object.freeze(results.slice()),
      readyForGateRetirement:inspection.readyForGateRetirement && !failed,
      blocker:inspection.blocker || (failed ? `${failed.kind}:${failed.status}` : '')
    });
  }

  function refreshAfterCards(options = {}){
    const results = [];

    record(results,'bulk-status',bound(ROOT.V51QuestionBankBulkStatus,'renderSummary'));
    record(results,'qa',bound(ROOT.V51QuestionBankQA,'render'));
    record(results,'review',bound(ROOT.V51QuestionReviewWorkflow,'renderAll'));
    record(results,'topical-library',bound(ROOT.V52TeacherTopicalLibrary,'render'));
    record(results,'topical-activation',bound(ROOT.V52TopicalActivationGuard,'decorate'));
    record(results,'multipart',bound(ROOT.V51MultipartQuestionManagement,'renderGroup'));

    const historyLifecycle = explicitHistoryLifecycle(options);
    if (historyLifecycle) record(results,'correction-history',historyLifecycle);
    else blockedHistory(results);

    return result('cards',results,options);
  }

  function refreshAfterSelection(options = {}){
    const results = [];

    record(results,'bulk-status',bound(ROOT.V51QuestionBankBulkStatus,'renderSummary'));
    record(results,'topical-activation',bound(ROOT.V52TopicalActivationGuard,'decorate'));
    record(results,'review',bound(ROOT.V51QuestionReviewWorkflow,'renderAll'));
    record(results,'multipart',bound(ROOT.V51MultipartQuestionManagement,'renderGroup'));

    const historyLifecycle = explicitHistoryLifecycle(options);
    if (historyLifecycle) record(results,'correction-history',historyLifecycle);
    else blockedHistory(results);

    return result('selection',results,options);
  }

  const api = Object.freeze({
    CARD_REFRESH_ORDER,
    SELECTION_REFRESH_ORDER,
    inspectContracts,
    refreshAfterCards,
    refreshAfterSelection
  });

  Object.defineProperty(ROOT,'Phase7CQuestionBankRefreshCoordinatorPrototype',{
    value:api,
    writable:false,
    configurable:false
  });
})(typeof window !== 'undefined' ? window : globalThis);
