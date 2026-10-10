import { TestBed } from '@angular/core/testing';

import { Puestos } from './puestos';

describe('Puestos', () => {
  let service: Puestos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Puestos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
