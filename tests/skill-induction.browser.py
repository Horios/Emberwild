"""Integration checks. Start both static servers on 8000/8001; requires Playwright + Chromium."""
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(accept_downloads=True)
    errors = []
    game = context.new_page()
    game.on('pageerror', lambda e: errors.append(str(e)))
    game.goto('http://127.0.0.1:8000/')
    game.locator('.save-slot-select').first.click()
    game.get_by_role('button', name='選擇戰士', exact=True).click()
    game.get_by_role('button', name='確認建立', exact=True).click()
    game.get_by_role('button', name='前往隊伍編成招募夥伴', exact=True).click()
    result = game.evaluate('''()=>{
      const doc=exportableBalance(),skills=doc.classes[0].skills;
      for(const sk of skills){sk.requiredLevel=1;sk.requiresAdvanced=false;sk.requiredMastery=null;sk.requiredMasteryLevel=0;sk.weaponTypes=[];sk.partnerId=null;}
      skills[0].effect='induceSkill';skills[0].tags=['induce'];skills[0].induction={targets:[{kind:'activeSlot',slot:1,chance:1},{kind:'procSlot',slot:0,chance:1}]};
      skills[1].effect='shield';skills[1].power=2;skills[2].effect='nextActiveDamage';skills[2].power=.25;skills[2].procBaseChance=0;
      applyBalanceConfig(doc);state.skills=skills.map(()=>1);state.active=[0,1];state.procSlots=[2,3];state.shield=0;
      const key=memberKey(state)+'-1';actorCooldowns[key]=99;
      const ok=castPartySkill(state,0,battleStats(state));
      return {ok,shield:state.shield,bonus:state.nextActiveDamageBonus,cd:actorCooldowns[key]};
    }''')
    assert result['ok'] and result['shield'] > 0 and result['bonus'] == .25 and result['cd'] == 99, result
    print('PASS actual active → active/proc: ignores cooldown and natural proc chance, leaves target cooldown intact')
    # Mutated slot cycles must also be blocked without trusting the importer.
    result = game.evaluate('''()=>{
      state.shield=0;delete state.nextActiveDamageBonus;
      CLASSES[0].skills[1][6].tags=['induce'];CLASSES[0].skills[1][6].induction={targets:[{kind:'activeSlot',slot:0,chance:1}]};
      CLASSES[0].skills[0][6].induction.targets=[{kind:'activeSlot',slot:1,chance:1}];
      castPartySkill(state,0,battleStats(state));
      const shield=state.shield;
      CLASSES[0].skills[2][6].tags=['induce'];CLASSES[0].skills[2][6].induction={targets:[{kind:'activeSlot',slot:1,chance:1}]};
      CLASSES[0].skills[1][6].tags=[];delete CLASSES[0].skills[1][6].induction;
      castPartySkill(state,2,battleStats(state));
      return {cycleShield:shield,procShield:state.shield};
    }''')
    assert result['cycleShield'] == 0 and result['procShield'] > 0, result
    print('PASS actual runtime slot cycle blocked; proc → active effect works')
    # Reload the original persisted valid config rather than the in-memory cycle.
    game.reload()
    assert game.evaluate("CLASSES[0].skills[0][5]==='induceSkill' && CLASSES[0].skills[0][6].induction.targets.length===2")
    assert game.evaluate("skillTypeBadges(0,0).includes('誘發') && !skillTypeBadges(0,0,'support').includes('誘發')")
    print('PASS persisted balance restores induction effect, tags, probabilities and targets')
    doc = game.evaluate('exportableBalance()')
    editor = context.new_page()
    editor.on('pageerror', lambda e: errors.append(str(e)))
    editor.on('dialog', lambda d: d.accept())
    editor.goto('http://127.0.0.1:8001/balance-editor.html')
    editor.locator('#fileInput').set_input_files({'name':'induction.json','mimeType':'application/json','buffer':json.dumps(doc).encode()})
    editor.locator('[data-sec="skills"]').click()
    assert editor.locator('#inductionEnabled').is_checked()
    editor.locator('#inductionEnabled').uncheck()
    assert editor.evaluate("data.classes[0].skills[0].effect==='damage' && !data.classes[0].skills[0].tags.includes('induce')")
    editor.locator('#inductionEnabled').check()
    editor.locator('[data-key="effect"]').select_option('induceSkill')
    assert editor.locator('#inductionEnabled').is_checked()
    editor.locator('#inductionChance0').fill('101')
    editor.locator('#inductionChance0').dispatch_event('change')
    assert editor.locator('#inductionChance0').input_value() == '100'
    editor.locator('#inductionTarget0').select_option('activeSlot:1')
    editor.locator('#inductionChance0').fill('37.5')
    editor.locator('#inductionChance0').dispatch_event('change')
    editor.locator('#inductionTarget1').select_option('procSlot:0')
    editor.locator('#inductionChance1').fill('0')
    editor.locator('#inductionChance1').dispatch_event('change')
    assert editor.evaluate('validateData()') == []
    with editor.expect_download() as download:
        editor.get_by_role('button', name='匯出測試 JSON', exact=True).click()
    exported = json.load(open(download.value.path()))
    source = exported['classes'][0]['skills'][0]
    assert source['effect'] == 'induceSkill' and source['tags'] == ['induce']
    assert [t['chance'] for t in source['induction']['targets']] == [.375, 0]
    assert game.evaluate('doc=>validateBalanceConfig(doc).classes[0].skills[0].induction.targets[0].chance', exported) == .375
    editor.reload()
    editor.locator('[data-sec="skills"]').click()
    assert editor.locator('#inductionChance0').input_value() == '37.5'
    assert editor.locator('#inductionEnabled').is_checked()
    print('PASS editor JSON import, UI configuration, export → game validation, auto-save/reload')
    # A forbidden target must be visible as an error and refused by the game importer.
    invalid = json.loads(json.dumps(exported))
    invalid['classes'][0]['skills'][0]['induction']['targets'] = [{'kind':'skill','skillId':source['id'],'chance':1}]
    assert game.evaluate('doc=>{try{validateBalanceConfig(doc);return false;}catch(e){return e.message.includes("不可誘發");}}', invalid)
    print('PASS game rejects an explicit self-induction reference')
    # Test shared monster casting through the actual enemy action/cooldown path.
    result = game.evaluate('''()=>{
      const doc=exportableBalance(),skills=doc.classes[0].skills;
      for(const sk of skills)sk.usageScope='shared';
      skills[0].induction={targets:[{kind:'skill',skillId:skills[1].id,chance:1}]};
      const row=doc.balanceSettings.monsters.catalog.find(m=>m.kind==='normal');
      row.skillAssignments=[{skillId:skills[0].id},{skillId:skills[1].id}];
      applyBalanceConfig(doc,{persist:false});
      const e={id:'induction-test-enemy',monsterId:row.id,kind:'normal',lv:60,hp:100,maxhp:100,atk:10,def:1,shield:0,element:'physical'};
      foes=[e];const ok=castEnemySharedSkill(e,sharedSkillById(skills[0].id));
      return {ok,shield:e.shield};
    }''')
    assert result['ok'] and result['shield'] > 0, result
    print('PASS actual shared monster induction produces target shield')
    assert not errors, errors
    print('PASS no browser JavaScript errors')
    browser.close()
