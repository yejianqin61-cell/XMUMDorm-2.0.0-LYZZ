import { useLanguage } from '../context/LanguageContext';
import './Disclaimer.css';

function ContactUs() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="disclaimer-page">
      <div className="disclaimer-card">
        <h1 className="disclaimer-title">{isZh ? '联系我们' : 'Contact Us'}</h1>

        {isZh ? (
          <div className="disclaimer-body">
            <p>
              如果您对 Dorm 平台有任何建议、反馈，或有意加入我们的团队，欢迎随时联系我们。
            </p>
            <p>
              如您是商家，且对平台中的店铺信息存在疑问、需要修改、删除内容或认领店铺管理权限，也可通过以下方式与我们联系，我们将尽快处理。
            </p>
            <p>
              联系方式：
            </p>
            <p>
              微信：YEJIANQIN_git<br />
              电话：01115078663<br />
              邮箱：yejianqin61@gmail.com
            </p>
            <p>
              Dorm 团队致力于构建一个真实、透明、便捷的校园信息平台，感谢您的支持与理解。
            </p>
          </div>
        ) : (
          <div className="disclaimer-body">
            <p>
              If you have any suggestions, feedback, or are interested in joining the Dorm team, feel free to contact us.
            </p>
            <p>
              If you are a merchant and have concerns about your store information on our platform, or wish to request modification, removal, or claim management access, please contact us. We will handle your request as soon as possible.
            </p>
            <p>
              Contact Information:
            </p>
            <p>
              WeChat: YEJIANQIN_git<br />
              Phone: 01115078663<br />
              Email: yejianqin61@gmail.com
            </p>
            <p>
              Dorm is committed to building a transparent and convenient campus information platform. Thank you for your support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContactUs;

