export default [
  {
    name: 'First name',
    type: 'text',
    required: true,
    max: '',
    min: '',
    maxLength: '80',
    minLength: '',
    pattern: '',
  },
  {
    name: 'Last name',
    type: 'text',
    required: true,
    max: '',
    min: '',
    maxLength: '100',
    minLength: '',
    pattern: '',
  },
  {
    name: 'Email',
    type: 'text',
    required: true,
    max: '',
    min: '',
    maxLength: '',
    minLength: '',
    pattern:
      '/^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$/',
  },
  {
    name: 'Developer',
    type: 'radio',
    required: true,
    max: '',
    min: '',
    maxLength: '',
    minLength: '',
    pattern: '',
    options: 'Yes;No',
  },
  {
    name: 'Mobile number',
    type: 'tel',
    required: true,
    max: '11',
    min: '8',
    maxLength: '',
    minLength: '',
    pattern: '',
  },
  {
    name: 'Title',
    type: 'select',
    required: true,
    max: '',
    min: '',
    maxLength: '',
    minLength: '',
    pattern: '',
    options: 'Mr;Mrs;Miss;Dr',
  },
];