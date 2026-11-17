const RUT_WEIGHTS = Object.freeze([2, 3, 4, 5, 6, 7]);

export function cleanRut(value){
  return String(value ?? '').toUpperCase().replace(/[^0-9K]/g, '');
}

export function rutVerificador(base){
  const digits = String(base ?? '').replace(/\D/g, '');
  if(!digits) return '';
  let sum = 0;
  for(let i = 0; i < digits.length; i += 1){
    sum += Number(digits[digits.length - 1 - i]) * RUT_WEIGHTS[i % RUT_WEIGHTS.length];
  }
  const result = 11 - (sum % 11);
  if(result === 11) return '0';
  if(result === 10) return 'K';
  return String(result);
}

export function formatRut(value){
  const clean = cleanRut(value);
  if(clean.length <= 1) return clean;
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${clean.slice(-1)}`;
}

export function validateRut(value){
  const clean = cleanRut(value);
  if(!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  return rutVerificador(clean.slice(0, -1)) === clean.slice(-1);
}

export function attachRutFormatting(input){
  if(!input) return;
  const handle = () => {
    if(!input.value){
      input.dataset.rutLength = '0';
      input.dataset.rutValue = '';
      return;
    }
    const clean = cleanRut(input.value);
    const previous = input.dataset.rutValue === input.value ? Number(input.dataset.rutLength || 0) : 0;
    if(clean.length > previous) input.value = formatRut(clean);
    input.dataset.rutLength = String(clean.length);
    input.dataset.rutValue = input.value;
  };
  input.addEventListener('input', handle);
}
