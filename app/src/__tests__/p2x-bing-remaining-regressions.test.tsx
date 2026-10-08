import * as React from 'react';
import {act, fireEvent} from '@testing-library/react-native';
import {renderApp} from './helpers/renderApp';
import {ReportSheet} from '@/components/ui/ReportSheet';
import {localDeadlineToISO} from '@/features/errand/DeadlineField';
import {Platform} from 'react-native';
import {focusAccessibilityRef} from '@/components/ui/ErrorSummary';
import {appendPublishImage} from '@/features/publish/images';

it('本地截止时间转带时区的 ISO，拒绝无效日期和不完整输入',()=>{
 const iso=localDeadlineToISO('2026-10-08','17:25');
 expect(iso).not.toBeNull();
 const date=new Date(iso!);expect([date.getFullYear(),date.getMonth()+1,date.getDate(),date.getHours(),date.getMinutes()]).toEqual([2026,10,8,17,25]);
 expect(localDeadlineToISO('2026-02-30','12:00')).toBeNull();
 expect(localDeadlineToISO('2026-10-08','24:00')).toBeNull();
 expect(localDeadlineToISO('2026-10-08','')).toBeNull();
});
it('举报先确认再发送，取消确认与失败重渲染保留原因和说明',async()=>{
 const send=jest.fn(),cancel=jest.fn();
 const props={maxDetailLength:1000,visible:true,reasons:[{value:'spam',label:'广告'}],reason:'spam',detail:'证据说明',onReason:jest.fn(),onDetail:jest.fn(),onSubmit:send,onCancel:cancel,busy:false,labels:{title:'举报',reason:'原因',detail:'说明',submit:'发送举报',cancel:'取消'}};
 function Harness(){const [failed,setFailed]=React.useState(false);return <ReportSheet {...props} onSubmit={()=>{send();setFailed(true);}} message={failed?'发送失败':undefined}/>;}
 const view=await renderApp(<Harness/>,{inScreen:true});
 await act(async()=>{await fireEvent.press(view.getByTestId('report-submit'));});expect(send).not.toHaveBeenCalled();
 expect(view.getByTestId('report-confirm',{includeHiddenElements:true})).toBeTruthy();
 await act(async()=>{await fireEvent.press(view.getAllByText('取消',{includeHiddenElements:true})[1]);});expect(send).not.toHaveBeenCalled();expect(cancel).not.toHaveBeenCalled();
 await act(async()=>{await fireEvent.press(view.getByTestId('report-submit'));});
 await act(async()=>{await fireEvent.press(view.getAllByText('发送举报',{includeHiddenElements:true})[1]);});expect(send).toHaveBeenCalledTimes(1);

 expect(view.getByDisplayValue('证据说明')).toBeTruthy();expect(view.getByText('广告')).toBeTruthy();expect(view.getByText('发送失败')).toBeTruthy();
});
it('Web 上传追加 Blob 和文件名，读取失败不追加虚假对象',async()=>{
 const os=Platform.OS;Object.defineProperty(Platform,'OS',{configurable:true,value:'web'});
 const oldFetch=global.fetch;const blob={type:'image/png'} as Blob;const append=jest.fn();
 global.fetch=jest.fn().mockResolvedValueOnce({ok:true,blob:async()=>blob}).mockResolvedValueOnce({ok:false});
 try {const image={uri:'blob:fixture',name:'fixture.png',type:'image/png',size:10};
 await appendPublishImage({append} as unknown as FormData,image);expect(append).toHaveBeenCalledWith('images',blob,'fixture.png');
 await expect(appendPublishImage({append} as unknown as FormData,image)).rejects.toEqual({kind:'content'});expect(append).toHaveBeenCalledTimes(1);
 }finally{global.fetch=oldFetch;Object.defineProperty(Platform,'OS',{configurable:true,value:os});}
});

it('Web 错误摘要直接聚焦 DOM ref，不走 findNodeHandle',()=>{
 const os=Platform.OS;Object.defineProperty(Platform,'OS',{configurable:true,value:'web'});
 try{const focus=jest.fn(),setAttribute=jest.fn();focusAccessibilityRef({focus,setAttribute});expect(focus).toHaveBeenCalledTimes(1);expect(setAttribute).toHaveBeenCalledWith('tabindex','-1');expect(()=>focusAccessibilityRef(null)).not.toThrow();}
 finally{Object.defineProperty(Platform,'OS',{configurable:true,value:os});}
});
