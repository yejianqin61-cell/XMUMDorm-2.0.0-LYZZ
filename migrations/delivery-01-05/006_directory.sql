-- Required reviewed directory, 10 colleges and 28 programmes. Runner owns atomic insertion/conflict checks.


INSERT INTO colleges (id,code,name,name_en,is_active) VALUES
 ('xmum-sem','SEM','经济与管理学院','School of Economics and Management',1),
 ('xmum-soc','SOC','传播学院','School of Communication',1),
 ('xmum-sass','SASS','人文与社会科学学院','School of Arts and Social Sciences',1),
 ('xmum-sece','SECE','能源与化工学院','School of Energy and Chemical Engineering',1),
 ('xmum-cams','CAMS','中国—东盟海洋学院','China-ASEAN College of Marine Sciences',1),
 ('xmum-scds','SCDS','计算与数据科学学院','School of Computing and Data Science',1),
 ('xmum-sair','SAIR','人工智能与机器人学院','School of Artificial Intelligence and Robotics',1),
 ('xmum-somp','SOMP','数学与物理学院','School of Mathematics and Physics',1),
 ('xmum-stcm','STCM','中医学院','School of Traditional Chinese Medicine',1),
 ('xmum-sfs','SFS','预科学院','School of Foundation Studies',1);

INSERT INTO academic_programmes (id,code,college_id,name,name_en,level,is_active) VALUES
 ('xmum-sem-accounting','SEM_ACCOUNTING','xmum-sem','会计学','Accounting','undergraduate',1),
 ('xmum-sem-finance','SEM_FINANCE','xmum-sem','金融学','Finance','undergraduate',1),
 ('xmum-sem-international-business','SEM_INTERNATIONAL_BUSINESS','xmum-sem','国际商务','International Business','undergraduate',1),
 ('xmum-sem-e-commerce','SEM_E_COMMERCE','xmum-sem','电子商务','E-Commerce','undergraduate',1),
 ('xmum-sem-hospitality-management','SEM_HOSPITALITY_MANAGEMENT','xmum-sem','酒店管理','Hospitality Management','undergraduate',1),
 ('xmum-soc-journalism','SOC_JOURNALISM','xmum-soc','新闻学','Journalism','undergraduate',1),
 ('xmum-soc-advertising','SOC_ADVERTISING','xmum-soc','广告学','Advertising','undergraduate',1),
 ('xmum-soc-communication','SOC_COMMUNICATION','xmum-soc','传播学','Communication','undergraduate',1),
 ('xmum-sass-chinese-studies','SASS_CHINESE_STUDIES','xmum-sass','中文','Chinese Studies','undergraduate',1),
 ('xmum-sass-english-language-literature','SASS_ENGLISH_LANGUAGE_LITERATURE','xmum-sass','英语语言与文学','English Language and Literature','undergraduate',1),
 ('xmum-sece-new-energy-science-engineering','SECE_NEW_ENERGY_SCIENCE_ENGINEERING','xmum-sece','新能源科学与工程','New Energy Science and Engineering','undergraduate',1),
 ('xmum-sece-chemical-engineering','SECE_CHEMICAL_ENGINEERING','xmum-sece','化学工程','Chemical Engineering','undergraduate',1),
 ('xmum-cams-marine-biotechnology','CAMS_MARINE_BIOTECHNOLOGY','xmum-cams','海洋生物技术','Marine Biotechnology','undergraduate',1),
 ('xmum-cams-marine-environmental-chemistry','CAMS_MARINE_ENVIRONMENTAL_CHEMISTRY','xmum-cams','海洋环境化学','Marine Environmental Chemistry','undergraduate',1),
 ('xmum-scds-computer-science-technology','SCDS_COMPUTER_SCIENCE_TECHNOLOGY','xmum-scds','计算机科学与技术','Computer Science and Technology','undergraduate',1),
 ('xmum-scds-software-engineering','SCDS_SOFTWARE_ENGINEERING','xmum-scds','软件工程','Software Engineering','undergraduate',1),
 ('xmum-scds-digital-media-technology','SCDS_DIGITAL_MEDIA_TECHNOLOGY','xmum-scds','数字媒体技术','Digital Media Technology','undergraduate',1),
 ('xmum-scds-cyber-security','SCDS_CYBER_SECURITY','xmum-scds','网络安全','Cyber Security','undergraduate',1),
 ('xmum-scds-data-science','SCDS_DATA_SCIENCE','xmum-scds','数据科学','Data Science','undergraduate',1),
 ('xmum-sair-electrical-electronics-engineering','SAIR_ELECTRICAL_ELECTRONICS_ENGINEERING','xmum-sair','电气与电子工程','Electrical and Electronics Engineering','undergraduate',1),
 ('xmum-sair-artificial-intelligence','SAIR_ARTIFICIAL_INTELLIGENCE','xmum-sair','人工智能','Artificial Intelligence','undergraduate',1),
 ('xmum-sair-robotics-automation-engineering','SAIR_ROBOTICS_AUTOMATION_ENGINEERING','xmum-sair','机器人工程与自动化','Robotics and Automation Engineering','undergraduate',1),
 ('xmum-somp-mathematics-applied-mathematics','SOMP_MATHEMATICS_APPLIED_MATHEMATICS','xmum-somp','数学与应用数学','Mathematics and Applied Mathematics','undergraduate',1),
 ('xmum-somp-physics','SOMP_PHYSICS','xmum-somp','物理学','Physics','undergraduate',1),
 ('xmum-stcm-traditional-chinese-medicine','STCM_TRADITIONAL_CHINESE_MEDICINE','xmum-stcm','中医学','Traditional Chinese Medicine','undergraduate',1),
 ('xmum-sfs-foundation-science','SFS_FOUNDATION_SCIENCE','xmum-sfs','理科预科','Foundation in Science','foundation',1),
 ('xmum-sfs-foundation-arts-social-science','SFS_FOUNDATION_ARTS_SOCIAL_SCIENCE','xmum-sfs','人文与社会科学预科','Foundation in Arts and Social Science','foundation',1),
 ('xmum-sfs-foundation-information-technology','SFS_FOUNDATION_INFORMATION_TECHNOLOGY','xmum-sfs','信息技术预科','Foundation in Information Technology','foundation',1);
