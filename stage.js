(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const eventId=new URLSearchParams(location.search).get('event')||'';
  const validEvent=/^EVT-[A-Za-z0-9-]{8,80}$/.test(eventId);
  const apiUrl=window.LOTTERY_PUBLIC_API_URL||'';
  let counter=0,sequence=0,timer=0,hasScreen=false;
  function clearNumbers(){$('numbers').replaceChildren();$('numbers').hidden=true;$('numbers').classList.remove('many');}
  function message(text,prize=''){$('prizeName').textContent=prize;$('notice').classList.remove('rolling');$('notice').textContent=text;$('notice').hidden=false;clearNumbers();}
  function failClosed(text){hasScreen=false;$('eventName').textContent='活動舞台';$('environment').textContent='無法顯示';message(text);$('lookup').hidden=true;}
  function request(){
    return new Promise((resolve,reject)=>{
      if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(apiUrl))return reject(Object.assign(new Error('公開舞台尚未設定'),{closed:true}));
      const callback=`lottery_${Date.now()}_${++counter}`,url=new URL(apiUrl);url.searchParams.set('action','stage');url.searchParams.set('event',eventId);url.searchParams.set('callback',callback);
      const script=document.createElement('script');let done=false;
      const finish=(error,data)=>{if(done)return;done=true;clearTimeout(timeout);script.remove();delete window[callback];error?reject(error):resolve(data);};
      window[callback]=result=>result&&result.ok?finish(null,result.data):finish(Object.assign(new Error('活動尚未開放公開舞台'),{closed:true}));
      script.onerror=()=>finish(new Error('舞台連線中斷'));
      const timeout=setTimeout(()=>finish(new Error('舞台連線逾時')),12000);script.src=url.toString();document.head.append(script);
    });
  }
  function prepareLookup(){
    const url=new URL('dashboard.html',location.href);url.search='';url.hash='';url.searchParams.set('event',eventId);
    const qr=eventQrCode_(0,'M');qr.addData(url.href,'Byte');qr.make();
    $('lookupQr').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr.createSvgTag(5,20));$('lookupLink').href=url.href;$('lookup').hidden=false;
  }
  function paint(data){
    if(!data||data.event_id!==eventId||!['rehearsal','production'].includes(data.environment))throw Object.assign(new Error('舞台資料驗證失敗'),{closed:true});
    const allowed=['blank','hidden','animation_ready','animating','lookup_notice','tickets'];
    if(!allowed.includes(data.stage)||!Array.isArray(data.numbers))throw Object.assign(new Error('舞台資料不完整'),{closed:true});
    $('eventName').textContent=data.event_name;$('environment').textContent=data.environment==='production'?'正式活動':'彩排環境';document.title=`${data.event_name}｜活動舞台`;prepareLookup();
    const prize=String(data.prize_name||'');
    if(data.stage==='blank')message('等待舞台切換');
    else if(data.stage==='hidden')message('準備揭曉',prize);
    else if(data.stage==='animation_ready')message('即將揭曉',prize);
    else if(data.stage==='animating'){message('抽獎進行中',prize);$('notice').classList.add('rolling');}
    else if(data.stage==='lookup_notice')message('獎項已開出，請至兌獎頁面查詢',prize);
    else {
      if(!data.numbers.length||data.numbers.length>50||data.numbers.some(x=>!/^[A-Za-z0-9_-]{1,32}$/.test(String(x))))throw Object.assign(new Error('舞台票號資料不完整'),{closed:true});
      $('prizeName').textContent=prize;$('notice').hidden=true;clearNumbers();const list=$('numbers');
      data.numbers.forEach((number,index)=>{const li=document.createElement('li');li.textContent=String(number);li.style.animationDelay=Math.min(index*35,700)+'ms';list.append(li);});
      list.classList.toggle('many',data.numbers.length>12);list.hidden=false;
    }
    hasScreen=true;$('connection').textContent='';
  }
  function next(){clearTimeout(timer);timer=setTimeout(refresh,2000);}
  async function refresh(){
    const requestId=++sequence;
    try{const data=await request();if(requestId!==sequence)return;paint(data);}
    catch(error){if(requestId!==sequence)return;if(error.closed||!hasScreen)failClosed(error.message);else $('connection').textContent=error.message+'，保留目前畫面並自動重連';}
    next();
  }
  if(!validEvent)failClosed('活動連結無效');else refresh();
})();
