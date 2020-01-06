import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FormlyModule, FieldWrapper, FormlyFieldConfig } from '@ngx-formly/core';
import {
  createFormlyFieldComponent,
  FormlyInputModule,
  createFieldChangesSpy,
  newEvent,
} from '@ngx-formly/core/testing';
import { ComponentFixture, tick, fakeAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

const renderComponent = (field: FormlyFieldConfig) => {
  return createFormlyFieldComponent(field, {
    declarations: [FormlyWrapperFormFieldAsync],
    imports: [
      FormlyInputModule,
      FormlyModule.forChild({
        wrappers: [
          {
            name: 'form-field-async',
            component: FormlyWrapperFormFieldAsync,
          },
        ],
      }),
    ],
  });
};

function getFormlyField(fixture: ComponentFixture<any>): HTMLInputElement {
  return <HTMLInputElement>fixture.nativeElement.querySelector('formly-field');
}

function getInputFieldType(fixture: ComponentFixture<any>): HTMLElement {
  return fixture.nativeElement.querySelector('formly-type-input');
}

function getFormFieldWrapper(fixture: ComponentFixture<any>): HTMLElement {
  return fixture.nativeElement.querySelector('formly-wrapper-form-field');
}

function getFormFieldWrapperAsync(fixture: ComponentFixture<any>): HTMLElement {
  return fixture.nativeElement.querySelector('formly-wrapper-form-field-async');
}

describe('FormlyField Component', () => {
  it('should add style display none to hidden field', () => {
    const fixture = renderComponent({ hide: true });

    expect(getFormlyField(fixture).getAttribute('style')).toEqual('display: none;');

    fixture.componentInstance.field.hide = false;
    fixture.detectChanges();
    expect(getFormlyField(fixture).getAttribute('style')).toEqual('');
  });

  it('should add field className', () => {
    const fixture = renderComponent({ className: 'foo-class' });

    expect(getFormlyField(fixture).getAttribute('class')).toEqual('foo-class');
  });

  it('should call field hooks if set', () => {
    const field: FormlyFieldConfig = {
      hooks: {
        afterContentInit: () => {},
        afterContentChecked: () => {},
        afterViewInit: () => {},
        afterViewChecked: () => {},
        doCheck: () => {},
        onInit: () => {},
        onChanges: () => {},
        onDestroy: () => {},
      },
    };

    const hooks = field.hooks;
    Object.keys(field.hooks).forEach(hook => {
      spyOn(hooks, hook);
    });

    const fixture = renderComponent(field);
    fixture.destroy();

    Object.keys(field.hooks).forEach(name => {
      expect(hooks[name]).toHaveBeenCalledWith(fixture.componentInstance.field);
    });
  });

  it('should render field type without wrapper', () => {
    const fixture = renderComponent({
      key: 'title',
      type: 'input',
      wrappers: [],
    });

    expect(getFormFieldWrapper(fixture)).toEqual(null);
    expect(getInputFieldType(fixture)).not.toBeNull();
  });

  it('should render field component with wrapper', () => {
    const fixture = renderComponent({
      key: 'title',
      type: 'input',
      wrappers: ['form-field'],
    });

    expect(getFormFieldWrapper(fixture)).not.toBeNull();
    expect(getInputFieldType(fixture)).not.toBeNull();
  });

  it('should render field component with async wrapper', () => {
    const fixture = renderComponent({
      key: 'title',
      type: 'input',
      wrappers: ['form-field-async'],
    });

    expect(getFormFieldWrapperAsync(fixture)).not.toBeNull();
    expect(getInputFieldType(fixture)).toBeNull();

    fixture.componentInstance.field.templateOptions.render = true;
    fixture.detectChanges();
    expect(getInputFieldType(fixture)).not.toBeNull();
  });

  it('should render after onInit', () => {
    const fixture = renderComponent({
      type: 'input',
      hooks: {
        onInit: f => (f.formControl = new FormControl()),
      },
    });

    expect(getInputFieldType(fixture)).not.toBeNull();
  });

  describe('valueChanges', () => {
    it('should emit valueChanges on control value change', () => {
      const fixture = renderComponent({
        key: 'foo',
        type: 'input',
      });

      const { field } = fixture.componentInstance;
      const [spy, subscription] = createFieldChangesSpy(field);

      field.formControl.setValue('First value');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ value: 'First value', field, type: 'valueChanges' });
      expect(field.model).toEqual({ foo: 'First value' });
      subscription.unsubscribe();
    });

    it('should apply parsers to the emitted valueChanges', () => {
      const fixture = renderComponent({
        key: 'foo',
        type: 'input',
        parsers: [Number],
      });

      const { field } = fixture.componentInstance;
      const [spy, subscription] = createFieldChangesSpy(field);

      field.formControl.setValue('15');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ value: 15, field, type: 'valueChanges' });
      subscription.unsubscribe();
    });

    it('should apply debounce to the emitted valueChanges', fakeAsync(() => {
      const fixture = renderComponent({
        key: 'foo',
        type: 'input',
        modelOptions: {
          debounce: { default: 5 },
        },
      });

      const { field } = fixture.componentInstance;
      const [spy, subscription] = createFieldChangesSpy(field);

      field.formControl.setValue('15');

      expect(spy).not.toHaveBeenCalled();
      tick(6);
      expect(spy).toHaveBeenCalled();
      subscription.unsubscribe();
    }));

    it('should ignore default debounce when using "blur" or "submit"', () => {
      const fixture = renderComponent({
        key: 'foo',
        type: 'input',
        modelOptions: {
          debounce: { default: 5 },
          updateOn: 'blur',
        },
      });

      const { field } = fixture.componentInstance;
      const [spy, subscription] = createFieldChangesSpy(field);

      field.formControl.setValue('15');
      expect(spy).toHaveBeenCalled();
      subscription.unsubscribe();
    });

    // https://github.com/ngx-formly/ngx-formly/issues/1857
    it('should emit a valid model value when using square bracket notation for key', () => {
      const fixture = renderComponent({
        key: 'o[0].0.name',
        type: 'input',
      });

      const { field } = fixture.componentInstance;
      field.formControl.setValue('***');
      expect(field.parent.model).toEqual({ o: [[{ name: '***' }]] });
    });

    it('should emit a valid model value when using square bracket notation for a fieldGroup key', () => {
      const fixture = renderComponent({
        key: 'group[0]',
        fieldGroup: [{ key: 'name', type: 'input' }],
      });

      const { field } = fixture.componentInstance;
      field.fieldGroup[0].formControl.setValue('***');
      expect(field.parent.model).toEqual({ group: [{ name: '***' }] });
    });

    it('should emit valueChanges on group control value change', () => {
      const fixture = renderComponent({
        key: 'foo',
        fieldGroup: [{ type: 'input', key: 'bar' }],
      });

      const { field } = fixture.componentInstance;
      const [spy, subscription] = createFieldChangesSpy(field);

      field.formControl.setValue({ bar: 'First value' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ value: 'First value', field: field.fieldGroup[0], type: 'valueChanges' });
      expect(field.parent.model).toEqual({ foo: { bar: 'First value' } });
      subscription.unsubscribe();
    });

    it('should emit `modelChange` twice when key is duplicated', () => {
      const fixture = renderComponent({
        fieldGroup: [{ key: 'title', type: 'input' }, { key: 'title', type: 'input' }],
      });

      const { field } = fixture.componentInstance;
      const [spy, subscription] = createFieldChangesSpy(field);

      field.formControl.get('title').setValue('***');
      expect(spy).toHaveBeenCalledTimes(2);
      subscription.unsubscribe();
    });

    it('should keep the value in sync when using multiple fields with same key', () => {
      const fixture = renderComponent({
        fieldGroup: [{ key: 'title', type: 'input' }, { key: 'title', type: 'input' }],
      });

      const inputs = fixture.debugElement.queryAll(By.css('input'));
      inputs[0].nativeElement.value = 'First';
      inputs[0].nativeElement.dispatchEvent(newEvent('input', false));

      fixture.detectChanges();
      expect(fixture.componentInstance.field.formControl.value).toEqual({ title: 'First' });
      expect(inputs[0].nativeElement.value).toEqual('First');
      expect(inputs[1].nativeElement.value).toEqual('First');
    });
  });
});

@Component({
  selector: 'formly-wrapper-form-field-async',
  template: `
    <div *ngIf="to.render">
      <ng-container #fieldComponent></ng-container>
    </div>
  `,
})
class FormlyWrapperFormFieldAsync extends FieldWrapper {}
