document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.cover').forEach(img=>{
    if(!img.complete){
      img.addEventListener('error', onError);
      img.addEventListener('load', ()=>{
        // hide link if it's an actual image
        const link = img.parentElement.querySelector('.cover-link');
        if(link) link.style.display = 'none';
      });
    } else if(img.naturalWidth === 0){
      onError.call(img);
    } else {
      const link = img.parentElement.querySelector('.cover-link');
      if(link) link.style.display = 'none';
    }
  });

  function onError(){
    const link = this.parentElement.querySelector('.cover-link');
    this.style.display = 'none';
    if(link) link.style.display = 'inline-block';
  }
});
