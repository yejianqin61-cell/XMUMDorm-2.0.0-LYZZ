import {act,renderHook} from '@testing-library/react-native';
import {useCampusReport} from '@/features/campus/useCampusReport';
import {submitReport} from '../../../shared/api/admin';
jest.mock('../../../shared/api/admin',()=>({submitReport:jest.fn()}));
const api=submitReport as jest.Mock;
const auth=jest.fn();
beforeEach(()=>{api.mockReset();auth.mockReset();});
const target={id:7,kind:'confession' as const};
it('树洞及匿名墙映射正确目标，修剪说明',async()=>{
 api.mockResolvedValue({id:1});
 const h=await renderHook(()=>useCampusReport(target,true,auth));
 await act(async()=>{await h.result.current.submit('spam','  evidence  ');});
 expect(api).toHaveBeenCalledWith({target_type:'post',target_id:7,reason:'spam',detail:'evidence',screenshots:undefined});
 expect(h.result.current.state).toBe('success');
 const w=await renderHook(()=>useCampusReport({id:8,kind:'wall'},true,auth));
 await act(async()=>{await w.result.current.submit('privacy','');});
 expect(api).toHaveBeenLastCalledWith({target_type:'confession',target_id:8,reason:'privacy',detail:'',screenshots:undefined});
});
it('游客和非法目标不发送请求',async()=>{
 const h=await renderHook(()=>useCampusReport(target,false,auth));
 await act(async()=>{await h.result.current.submit('spam','');});
 expect(h.result.current.state).toBe('login');expect(api).not.toHaveBeenCalled();
 const bad=await renderHook(()=>useCampusReport({id:0,kind:'wall'},true,auth));
 await act(async()=>{await bad.result.current.submit('spam','');});
 expect(bad.result.current.state).toBe('invalid');expect(api).not.toHaveBeenCalled();
});
it('网络失败可重试，成功后不会重复提交',async()=>{
 api.mockRejectedValueOnce(new TypeError('private')).mockResolvedValue({id:3});
 const h=await renderHook(()=>useCampusReport(target,true,auth));
 await act(async()=>{await h.result.current.submit('other','draft');});
 expect(h.result.current.state).toBe('failed');
 await act(async()=>{await h.result.current.submit('other','draft');await h.result.current.submit('other','draft');});
 expect(h.result.current.state).toBe('success');expect(api).toHaveBeenCalledTimes(2);
});
it('请求进行中不重复提交，切换目标忽略旧结果',async()=>{
 let finish:(x:unknown)=>void=()=>{};api.mockReturnValue(new Promise(r=>{finish=r;}));
 const h=await renderHook((props:unknown)=>useCampusReport({id:(props as {id:number}).id,kind:'wall'},true,auth),{initialProps:{id:7}});
 let pending:Promise<void>;
 await act(async()=>{pending=h.result.current.submit('spam','');void h.result.current.submit('spam','');});
 expect(api).toHaveBeenCalledTimes(1);
 await h.rerender({id:8});
 await act(async()=>{finish({id:1});await pending;});
 expect(h.result.current.state).toBe('idle');
});
it('过期会话触发统一处理，处罚不登出',async()=>{
 api.mockRejectedValue({status:403});
 const h=await renderHook(()=>useCampusReport(target,true,auth));
 await act(async()=>{await h.result.current.submit('spam','');});
 expect(auth).toHaveBeenCalledTimes(1);expect(h.result.current.state).toBe('login');
 api.mockRejectedValue({status:403,body:{muted:true}});
 await act(async()=>{await h.result.current.submit('spam','');});
 expect(auth).toHaveBeenCalledTimes(1);expect(h.result.current.state).toBe('denied');
});
