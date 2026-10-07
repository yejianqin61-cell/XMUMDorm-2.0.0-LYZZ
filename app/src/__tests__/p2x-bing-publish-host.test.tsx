import * as React from 'react';
import {fireEvent,waitFor} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {Form} from '@/components/ui/Form';
import {ToastProvider} from '@/components/ui/Toast';
import {usePublishFormCore} from '@/features/publish/usePublishForm';
import {createErrandPublishDescriptor} from '@/features/errand/publishFields';
import {useI18n} from '@/i18n';
import {createErrand} from '../../../shared/api/errands';
import {getQueryClient} from '@/shared/queryClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
const mockReplace=jest.fn();
jest.mock('expo-router',()=>({useRouter:()=>({replace:mockReplace,back:jest.fn(),push:jest.fn(),canGoBack:()=>true})}));
jest.mock('../../../shared/api/errands',()=>({createErrand:jest.fn()}));
function Host({accepted=true}:{accepted?:boolean}){const {t}=useI18n();const d=React.useMemo(()=>createErrandPublishDescriptor(t),[t]);const host=usePublishFormCore(d,{signedIn:true,acceptedTerms:accepted});return <Form testID="task-form" form={host.form} sections={host.sections} labels={host.labels} semantic={host.semantic} onSettled={host.onSettled}/>;}
beforeEach(async()=>{jest.clearAllMocks();await AsyncStorage.clear();getQueryClient().clear();});
afterEach(()=>getQueryClient().clear());
it('真实公共表单填写、提交并进入新跑腿详情',async()=>{
 (createErrand as jest.Mock).mockResolvedValue({id:52});const v=await renderApp(<ToastProvider><Host/></ToastProvider>);
 await fireEvent.changeText(v.getByTestId('task-form-title'),'Pickup');await fireEvent.changeText(v.getByTestId('task-form-reward'),'5');await fireEvent.changeText(v.getByTestId('task-form-contactInfo'),'0123456789');await fireEvent.press(v.getByTestId('task-form-submit'));
 await waitFor(()=>expect(mockReplace).toHaveBeenCalledWith('/errand/52'));expect(createErrand).toHaveBeenCalledTimes(1);
});
it('公共宿主第二道条款门禁阻止直接提交',async()=>{
 const v=await renderApp(<ToastProvider><Host accepted={false}/></ToastProvider>);
 await fireEvent.changeText(v.getByTestId('task-form-title'),'Pickup');await fireEvent.changeText(v.getByTestId('task-form-reward'),'5');await fireEvent.changeText(v.getByTestId('task-form-contactInfo'),'0123456789');await fireEvent.press(v.getByTestId('task-form-submit'));
 await waitFor(()=>expect(v.getByTestId('task-form-summary')).toBeTruthy());expect(createErrand).not.toHaveBeenCalled();expect(mockReplace).not.toHaveBeenCalled();
});
it('接口失败保留正文和联系方式，不跳转',async()=>{
 (createErrand as jest.Mock).mockRejectedValue({kind:'unreachable'});const v=await renderApp(<ToastProvider><Host/></ToastProvider>);
 await fireEvent.changeText(v.getByTestId('task-form-title'),'Pickup');await fireEvent.changeText(v.getByTestId('task-form-reward'),'5');await fireEvent.changeText(v.getByTestId('task-form-contactInfo'),'0123456789');await fireEvent.press(v.getByTestId('task-form-submit'));
 await waitFor(()=>expect(v.getByTestId('task-form-summary')).toBeTruthy());expect(v.getByTestId('task-form-title').props.value).toBe('Pickup');expect(v.getByTestId('task-form-contactInfo').props.value).toBe('0123456789');expect(mockReplace).not.toHaveBeenCalled();
});
