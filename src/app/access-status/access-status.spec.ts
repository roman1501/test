import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessStatus } from './access-status';

describe('AccessStatus', () => {
  let component: AccessStatus;
  let fixture: ComponentFixture<AccessStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessStatus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
