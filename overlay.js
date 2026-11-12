(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const eventId=new URLSearchParams(location.search).get('event')||'';
  const validEvent=/^EVT-[A-Za-z0-9-]{8,80}$/.test(eventId);
  const apiUrl=window.LOTTERY_PUBLIC_API_URL||'';
  let counter=0,sequence=0,timer=0,revealTimer=0,hasScreen=false,lastSignature='',lastDrawId='',pendingDrawId='';
  function clearNumbers(){$('numbers').replaceChildren();$('numbers').hidden=true;$('numbers').classList.remove('many');}
  function hide(){hasScreen=false;lastSignature='';lastDrawId='';pendingDrawId='';clearTimeout(revealTimer);$('panel').hidden=true;$('connection').textContent='';document.body.classList.remove('visible');clearNumbers();}
  function showMessage(text,prize,rolling=false){$('prizeName').textContent=prize;$('notice').textContent=text;$('notice').hidden=false;$('notice').classList.toggle('rolling',rolling);clearNumbers();$('panel').hidden=false;document.body.classList.add('visible');}
  function request(){
    return new Promise((resolve,reject)=>{
      if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(apiUrl))return reject(Object.assign(new Error('公開疊圖尚未設定'),{closed:true}));
      const callback=`lottery_overlay_${Date.now()}_${++counter}`,url=new URL(apiUrl);url.searchParams.set('action','stage');url.searchParams.set('event',eventId);url.searchParams.set('callback',callback);
      const script=document.createElement('script');let done=false;
      const finish=(error,data)=>{if(done)return;done=true;clearTimeout(timeout);script.remove();delete window[callback];error?reject(error):resolve(data);};
      window[callback]=result=>result&&result.ok?finish(null,result.data):finish(Object.assign(new Error('活動尚未開放 OBS 疊圖'),{closed:true}));
      script.onerror=()=>finish(new Error('OBS 疊圖連線中斷'));
      const timeout=setTimeout(()=>finish(new Error('OBS 疊圖連線逾時')),12000);script.src=url.toString();document.head.append(script);
    });
  }
  function paintTickets(data,prize,signature){
    if(!data.numbers.length||data.numbers.length>50||data.numbers.some(x=>!/^[A-Za-z0-9_-]{1,32}$/.test(String(x))))throw Object.assign(new Error('中獎號碼資料不完整'),{closed:true});
    $('prizeName').textContent=prize;$('notice').hidden=true;clearNumbers();const list=$('numbers');
    data.numbers.forEach((number,index)=>{const li=document.createElement('li');li.textContent=String(number);li.style.animationDelay=Math.min(index*45,800)+'ms';list.append(li);});
    list.classList.toggle('many',data.numbers.length>8);list.hidden=false;$('panel').hidden=false;document.body.classList.add('visible');
    if(signature!==lastSignature)$('panel').animate?.([{transform:'scale(.975)',opacity:.3},{transform:'scale(1)',opacity:1}],{duration:360,easing:'ease-out'});
    lastSignature=signature;lastDrawId=String(data.draw_id||'');pendingDrawId='';hasScreen=true;$('connection').textContent='';
  }
  function paint(data){
    if(!data||data.event_id!==eventId||!['rehearsal','production'].includes(data.environment))throw Object.assign(new Error('疊圖資料驗證失敗'),{closed:true});
    if(!['blank','hidden','animation_ready','animating','lookup_notice','tickets'].includes(data.stage)||!Array.isArray(data.numbers))throw Object.assign(new Error('疊圖資料不完整'),{closed:true});
    if(['blank','hidden'].includes(data.stage)){hide();return;}
    const prize=String(data.prize_name||''),signature=[data.draw_id,data.stage,data.numbers.join('|')].join(':');
    if(data.stage==='animation_ready'){lastDrawId=String(data.draw_id||'');showMessage('即 將 揭 曉',prize);}
    else if(data.stage==='animating'){lastDrawId=String(data.draw_id||'');showMessage('幸 運 抽 獎 中',prize,true);}
    else if(data.stage==='lookup_notice')showMessage('獎項已開出\n請至兌獎頁面查詢',prize);
    else {
      const drawId=String(data.draw_id||'');
      if(lastDrawId&&drawId!==lastDrawId&&pendingDrawId!==drawId){pendingDrawId=drawId;showMessage('幸 運 抽 獎 中',prize,true);hasScreen=true;clearTimeout(revealTimer);revealTimer=setTimeout(()=>paintTickets(data,prize,signature),1800);return;}
      if(pendingDrawId===drawId)return;
      paintTickets(data,prize,signature);return;
    }
    if(signature!==lastSignature)$('panel').animate?.([{transform:'scale(.975)',opacity:.3},{transform:'scale(1)',opacity:1}],{duration:360,easing:'ease-out'});
    lastSignature=signature;hasScreen=true;$('connection').textContent='';
  }
  function next(){clearTimeout(timer);timer=setTimeout(refresh,1000);}
  async function refresh(){
    const requestId=++sequence;
    try{const data=await request();if(requestId!==sequence)return;paint(data);}
    catch(error){if(requestId!==sequence)return;if(error.closed||!hasScreen)hide();else $('connection').textContent=error.message+'，保留目前畫面並自動重連';}
    next();
  }
  if(!validEvent)hide();else refresh();
})();
