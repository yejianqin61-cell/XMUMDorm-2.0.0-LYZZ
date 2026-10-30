import * as React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';
import { WallTemplateBody } from '@/features/campus/wallTemplates';
import { WallPublishPreview } from '@/features/campus/WallPublishPreview';
import { renderApp } from './helpers/renderApp';

describe('万能墙同源模板块', () => {
  it('公告标识与200字多行正文完整可读，不作为固定控件限制字号', async () => {
    const content = `今晚八点图书馆闭馆\n${'请带好随身物品'.repeat(30)}`.slice(0, 200);
    const view = await renderApp(<WallTemplateBody templateKey="announcement" content={content} />);
    expect(view.getByText('公告卡')).toBeTruthy();
    const body = view.getByText(content);
    expect(body.props.numberOfLines).toBeUndefined();
    expect(body.props.maxFontSizeMultiplier).toBeUndefined();
  });

  it('英语公告与未知模板标识遵守共享回退', async () => {
    function Example() {
      const [key, setKey] = React.useState('announcement');
      return <><WallTemplateBody templateKey={key} content="Library closes at eight" /><Button label="Change" onPress={() => setKey('unknown')} /></>;
    }
    const view = await renderApp(<Example />, { locale: 'en' });
    expect(view.getByText('Announcement')).toBeTruthy();
    await fireEvent.press(view.getByText('Change'));
    expect(view.getByText('Poster')).toBeTruthy();
    expect(view.getByText('Library closes at eight')).toBeTruthy();
  });

  it('清单逐项保留，图标不代替正文', async () => {
    const view = await renderApp(<WallTemplateBody templateKey="checklist" content={'带学生卡\n带水杯'} />);
    expect(view.getByText('清单卡')).toBeTruthy();
    expect(within(view.getByTestId('wall-template-content')).getByText('带学生卡')).toBeTruthy();
    expect(view.getByText('带水杯')).toBeTruthy();
    expect(view.getByTestId('wall-checklist-icon-1', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('万能墙发布业务预览', () => {
  it('切换到公告仍显示完整输入并复用阅读标识', async () => {
    const content = '请于今晚八点前归还借用设备\n谢谢配合';
    function Example() {
      const [key, setKey] = React.useState('letter');
      return <><WallPublishPreview values={{ template_key: key, content }} /><Button label="选公告" onPress={() => setKey('announcement')} /></>;
    }
    const view = await renderApp(<Example />);
    expect(view.getByText('档案卡')).toBeTruthy();
    await fireEvent.press(view.getByText('选公告'));
    expect(view.getByText('公告卡')).toBeTruthy();
    expect(view.getByText(content)).toBeTruthy();
    expect(view.getByText(content).props.numberOfLines).toBeUndefined();
  });

  it('空输入不给伪造的公告正文', async () => {
    const view = await renderApp(<WallPublishPreview values={{ template_key: 'announcement', content: '' }} />);
    expect(view.queryByTestId('wall-template-content')).toBeNull();
  });
});
