import { createWallPublishDescriptor } from '@/features/campus/publishFields';
import { fieldsOf, assertDescriptorInvariants } from '@/features/publish/descriptor';
import { validateAll } from '@/components/ui/Form';
import { zh, en } from '@/i18n';
import { createConfession } from '../../../shared/api/confessions';

jest.mock('../../../shared/api/confessions', () => ({ createConfession: jest.fn() }));
const api = createConfession as jest.Mock;
const descriptor = () => createWallPublishDescriptor((key) => en[key]);

describe('丙：万能墙发布描述符', () => {
  beforeEach(() => api.mockReset());
  it('符合公共契约，枚举来自共享常量且选项使用当前语言', () => {
    const d = descriptor();
    expect(() => assertDescriptorInvariants([d], Object.keys(zh))).not.toThrow();
    expect(d.id).toBe('wall');
    expect(d.semantic).toBe('create');
    expect(fieldsOf(d).find(f => f.name === 'template_key')?.source).toEqual({kind:'constants', options:[
      {value:'bigtype',label:'Big Type'}, {value:'letter',label:'Letter'}, {value:'note',label:'Sticky Note'}
    ]});
  });
  it.each([['bigtype',60],['letter',1000],['note',300]])('%s 的边界准确', (template, limit) => {
    const fields = fieldsOf(descriptor());
    expect(validateAll(fields,{template_key:template,content:'字'.repeat(Number(limit))})).toEqual({});
    expect(validateAll(fields,{template_key:template,content:'字'.repeat(Number(limit)+1)}).content).toBe('publish.wall.tooLong');
  });
  it('同一描述符切换版式立即改变校验，不删除原输入', () => {
    const fields = fieldsOf(descriptor());
    const content = '字'.repeat(301);
    expect(validateAll(fields,{template_key:'letter',content})).toEqual({});
    expect(validateAll(fields,{template_key:'note',content}).content).toBe('publish.wall.tooLong');
    expect(validateAll(fields,{template_key:'bigtype',content}).content).toBe('publish.wall.tooLong');
    expect(content.length).toBe(301);
  });
  it('空内容与非法版式禁止请求', async () => {
    const d=descriptor();
    expect(validateAll(fieldsOf(d),{template_key:'bigtype',content:'  '}).content).toBe('form.error.required');
    expect(validateAll(fieldsOf(d),{template_key:'invalid',content:'正文'}).template_key).toBe('publish.wall.invalidTemplate');
    await expect(d.submit({template_key:'invalid',content:'正文'})).rejects.toMatchObject({kind:'validation'});
    await expect(d.submit({template_key:'bigtype',content:'字'.repeat(61)})).rejects.toMatchObject({kind:'validation'});
    expect(api).not.toHaveBeenCalled();
  });
  it('提交只传正文和版式，成功后返回校园列表', async () => {
    api.mockResolvedValue({id:42});
    const d=descriptor();
    const result=await d.submit({template_key:'note',content:'寻找钥匙',user_id:9});
    expect(api).toHaveBeenCalledWith({template_key:'note',content:'寻找钥匙'});
    expect(result).toEqual({id:42});
    expect(d.routeAfterSubmit?.(result)).toBe('/(tabs)/campus');
  });
  it('网络失败原样交给公共宿主，不假报成功', async () => {
    const error={kind:'unreachable'};
    api.mockRejectedValue(error);
    await expect(descriptor().submit({template_key:'bigtype',content:'正文'})).rejects.toBe(error);
  });
});
