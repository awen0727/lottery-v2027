(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const eventId = new URLSearchParams(location.search).get('event') || '';
  const validEvent = /^EVT-[A-Za-z0-9-]{8,80}$/.test(eventId);
  const apiUrl = window.LOTTERY_PUBLIC_API_URL || '';
  let offset = 0, total = 0, counter = 0, busy = false, activeTicket = '';
  let eventLoaded = false;
  function message(text) { $('message').textContent = text; }
  function request(action, extra = {}) {
    return new Promise((resolve, reject) => {
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(apiUrl)) return reject(new Error('公開查詢尚未設定'));
      const callback = `lottery_${Date.now()}_${++counter}`;
      const url = new URL(apiUrl);
      Object.entries({ action, event: eventId, callback, ...extra }).forEach(([key, value]) => url.searchParams.set(key, value));
      const script = document.createElement('script');
      let done = false;
      const finish = (error, data) => {
        if (done) return;
        done = true; clearTimeout(timer); script.remove(); delete window[callback];
        error ? reject(error) : resolve(data);
      };
      window[callback] = result => result && result.ok ? finish(null, result.data) : finish(new Error('查詢暫時無法完成'));
      script.onerror = () => finish(new Error('無法連接查詢服務'));
      const timer = setTimeout(() => finish(new Error('查詢逾時，請重試')), 15000);
      script.src = url.toString(); document.head.append(script);
    });
  }
  function addItems(items, target) {
    items.forEach(item => {
      const li = document.createElement('li');
      const number = document.createElement('span'); number.className = 'ticket'; number.textContent = item.number;
      const prize = document.createElement('span'); prize.textContent = item.prize;
      li.append(number, prize); target.append(li);
    });
  }
  async function loadList() {
    let data = await request('list', { offset, limit: 100 });
    if(offset>0&&offset>=data.total){offset=0;data=await request('list',{offset,limit:100});}
    total = data.total;
    $('winnerList').replaceChildren();
    addItems(data.items, $('winnerList'));
    $('listCount').textContent = `已公布 ${total} 筆`;
    $('pageRange').textContent=total?`目前顯示第 ${offset+1}～${offset+data.items.length} 筆`:'';
    $('loadMore').hidden = offset+data.items.length >= total;
    $('previous').hidden = offset===0;
  }
  async function loadTicket(){
    const data=await request('ticket',{number:activeTicket}),target=$('ticketResult');target.replaceChildren();
    if(!data.items.length){target.textContent='目前沒有此票號的已公布中獎紀錄。';return;}
    const list=document.createElement('ul');addItems(data.items,list);target.append(list);
  }
  async function task(action){
    if(busy)return;busy=true;
    ['loadMore','previous','refresh','ticketSubmit'].forEach(id=>$(id).disabled=true);
    try{message('');await action();}catch(error){message(error.message);}
    finally{busy=false;['loadMore','previous','refresh','ticketSubmit'].forEach(id=>$(id).disabled=false);}
  }
  $('ticketForm').addEventListener('submit',event=>{
    event.preventDefault();if(busy)return Promise.resolve();
    activeTicket=$('ticketInput').value.trim();$('ticketResult').replaceChildren();
    if(!/^[A-Za-z0-9_-]{1,32}$/.test(activeTicket)){message('請輸入有效票號');activeTicket='';return Promise.resolve();}
    return task(loadTicket);
  });
  const page=next=>task(async()=>{const old=offset;offset=next;try{await loadList();}catch(error){offset=old;throw error;}});
  $('loadMore').addEventListener('click',()=>page(offset+100));
  $('previous').addEventListener('click',()=>page(Math.max(0,offset-100)));
  const refresh=()=>task(async()=>{
    if (!validEvent) throw new Error('活動連結無效');
    if (!eventLoaded) {
      const event = await request('event');
      $('eventName').textContent = event.name;
      $('eventDate').textContent = event.date || '';
      document.title = `${event.name}｜兌獎查詢`;
      eventLoaded = true;
    }
    await loadList();
    if(activeTicket)await loadTicket();
  });
  $('refresh').addEventListener('click',refresh);
  refresh();
  if(typeof setInterval==='function'&&validEvent)setInterval(()=>{if(!document.hidden)refresh();},10000);
})();
