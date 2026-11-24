import { beforeEach, afterEach } from 'vitest';

function clearStorage(){
  try{
    if(typeof localStorage !== 'undefined' && localStorage) localStorage.clear();
  }catch(e){
    // jsdom may not be installed as a global in every test file.
  }
}

beforeEach(() => {
  clearStorage();
});

afterEach(() => {
  clearStorage();
});
