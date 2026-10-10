import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CobradorDashboard } from './cobrador-dashboard';

describe('CobradorDashboard', () => {
  let component: CobradorDashboard;
  let fixture: ComponentFixture<CobradorDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CobradorDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(CobradorDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
