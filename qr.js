'use strict';
(() => {
  const $=id=>document.getElementById(id);
  try {
    const eventId=new URL(location.href).searchParams.get('event')||'';
    if(!/^EVT-[A-Za-z0-9-]{8,80}$/.test(eventId))throw new Error('請由管理後台開啟此活動的 QR Code 連結。');
    const url=new URL('dashboard.html',location.href);url.search='';url.hash='';url.searchParams.set('event',eventId);
    const qr=eventQrCode_(0,'M');qr.addData(url.href,'Byte');qr.make();
    const svg=qr.createSvgTag(6,24),blobUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    $('qr').src=blobUrl;$('download').href=blobUrl;$('download').download=eventId+'-qr.svg';
    $('url').value=url.href;$('lookup').href=url.href;$('qrPanel').hidden=false;
    $('status').textContent='此 QR Code 固定連結至該活動的查獎頁。';
  } catch(error) { $('status').textContent=error.message; }
})();
