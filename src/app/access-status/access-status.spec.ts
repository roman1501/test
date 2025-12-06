import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessStatusComponent } from './access-status';

describe('AccessStatus', () => {
  let component: AccessStatusComponent;
  let fixture: ComponentFixture<AccessStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessStatusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessStatusComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
