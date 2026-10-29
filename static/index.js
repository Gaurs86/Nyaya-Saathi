const I = {
  en: { title:"Nyaya Saathi", tag:"Understand your legal notice in simple words.", agree:"I agree and continue",
    upload:"Upload your notice", hint:"Take a clear photo of each page (up to 3), or choose a PDF.", pick:"📷 Take photo or choose file", rm:"Remove",
    received:"Date you received the notice (optional)", receivedHint:"This helps us work out your deadline.", district:"Your district (optional)", none:"Select district",
    go:"Explain my notice", s1:"Reading your notice…", s2:"Checking deadlines and rules…", s3:"Writing your explanation…", wait:"This takes about 20 seconds.",
    help:"Is this about arrest, violence or a child? Get help now", call:"📞 Call NALSA 15100", urgent:"URGENT: contact legal aid today",
    listen:"🔊 Listen", stop:"⏹ Stop", print:"🖨 Print", up:"👍 Helpful", down:"👎 Not helpful", thanks:"Thank you for your feedback.",
    briefTitle:"Lawyer intake brief (draft)", briefStatus:"Draft pending lawyer review. Check every fact, quotation and date against the original before relying on this brief.", downloadBrief:"Download lawyer brief (JSON)", saveToWorkspace:"Save to lawyer review workspace",
    again:"Check another notice", follow:"Ask a question about this notice", ask:"Ask", ph:"Type your question", err:"Something went wrong.", nofile:"Please add at least one page.",
    welcomeConsent:"Understand your legal notice, step by step.",
    navDashboard:"Dashboard",
    navUpload:"Upload Document",
    navQueue:"Review Queue",
    navAllCases:"All Cases",
    navMore:"More",
    navReports:"Reports",
    navResources:"Legal Resources",
    privacyTitle:"Your documents matter",
    privacyNote:"Review how your document is processed before sharing sensitive information.",
    workspaceLabel:"Workspace",
    dashboardTitle:"Dashboard",
    dashboardSubtitle:"Choose where you want to start.",
    overviewLabel:"Overview",
    dashboardHero:"Your legal notice, made easier to understand.",
    dashboardIntro:"Start a new document analysis or continue with saved briefs in the lawyer review workspace.",
    startAnalysis:"Analyze a new notice",
    uploadCardTitle:"Upload a document",
    uploadCardText:"Get a plain-language explanation, important dates and a draft intake brief.",
    uploadNow:"Upload now →",
    queueCardTitle:"Review pending cases",
    queueCardText:"Open the token-protected lawyer workspace to review saved briefs.",
    openQueue:"Open review queue →",
    allCasesCardTitle:"Find a saved case",
    allCasesCardText:"Search saved cases and filter by review status.",
    openAllCases:"Browse all cases →",
    howTitle:"How it works",
    stepOneTitle:"Upload",
    stepOneText:"Choose a clear PDF or page images.",
    stepTwoTitle:"Understand",
    stepTwoText:"Read the explanation and check facts, dates and quotations.",
    stepThreeTitle:"Review",
    stepThreeText:"Save a draft only when you are authorised to store it for lawyer review.",
    noticeBoundaryTitle:"Important",
    noticeBoundary:"This tool provides legal information, not legal advice. AI-generated facts and dates need checking against the original document.",
    uploadStep:"New analysis",
    dropTitle:"Select your notice or document pages",
    dropHint:"PDF or images · one PDF or up to three images",
    districtHint:"Local legal-aid contacts may not be available for every district.",
    analysisComplete:"Analysis complete",
    resultsTitle:"Understand your notice",
    resultsHint:"Read the summary, check important dates and verify the evidence below.",
    reportsLabel:"Evaluation",
    reportsTitle:"Extraction evaluation",
    reportsIntro:"The prototype does not yet provide live operational reports. Developer evaluation is run locally against a reviewed benchmark and saved JSON outputs.",
    reportsBoundaryTitle:"No invented metrics",
    reportsBoundary:"No case totals or accuracy rates are shown here because there is no authenticated reporting endpoint yet.",
    evalGuide:"Open evaluation guide ↗",
    resourcesLabel:"Support",
    resourcesTitle:"Legal help resources",
    resourcesIntro:"This prototype has not yet integrated a verified, district-by-district legal aid directory. Use the contact below for a starting point and confirm current availability with the service.",
    nalsaTitle:"NALSA legal aid helpline",
    nalsaText:"Call for information on legal aid and help finding the appropriate service.",
    callNalsa:"Call 15100",
    lawyerTitle:"Speak with a qualified lawyer",
    lawyerText:"Ask a qualified professional to verify the notice, any applicable deadline, and the response options before acting.",
    reportsPageSubtitle:"Review how the extraction benchmark is used to test the prototype.",
    resourcesPageSubtitle:"Starting points for finding professional legal support.",
    uploadPageTitle:"Upload Document",
    uploadPageSubtitle:"Upload a notice to get a plain-language explanation and a reviewable draft.",
    queuePageTitle:"Review Queue",
    queuePageSubtitle:"Review saved briefs that need attention.",
    allCasesPageTitle:"All Cases",
    allCasesPageSubtitle:"Browse saved cases and filter by review status.",
    footer:"This is legal information, not legal advice. Please confirm with a lawyer or legal aid volunteer." },
  hi: { title:"न्याय साथी", tag:"अपने कानूनी नोटिस को आसान शब्दों में समझें।", agree:"मैं सहमत हूँ, आगे बढ़ें",
    upload:"अपना नोटिस अपलोड करें", hint:"हर पन्ने की साफ़ फ़ोटो लें (अधिकतम 3) या PDF चुनें।", pick:"📷 फ़ोटो लें या फ़ाइल चुनें", rm:"हटाएँ",
    received:"नोटिस मिलने की तारीख़ (वैकल्पिक)", receivedHint:"इससे आपकी अंतिम तिथि निकालने में मदद मिलती है।", district:"आपका ज़िला (वैकल्पिक)", none:"ज़िला चुनें",
    go:"मेरा नोटिस समझाएँ", s1:"आपका नोटिस पढ़ रहे हैं…", s2:"समय-सीमा और नियम जाँच रहे हैं…", s3:"आपके लिए समझाइश लिख रहे हैं…", wait:"इसमें लगभग 20 सेकंड लगते हैं।",
    help:"क्या यह गिरफ़्तारी, हिंसा या बच्चे के बारे में है? अभी मदद लें", call:"📞 NALSA 15100 पर कॉल करें", urgent:"ज़रूरी: आज ही कानूनी सहायता से संपर्क करें",
    listen:"🔊 सुनें", stop:"⏹ रोकें", print:"🖨 प्रिंट", up:"👍 उपयोगी", down:"👎 उपयोगी नहीं", thanks:"आपकी राय के लिए धन्यवाद।",
    briefTitle:"वकील के लिए केस-सार (मसौदा)", briefStatus:"यह मसौदा वकील की समीक्षा के लिए है। भरोसा करने से पहले हर तथ्य, उद्धरण और तारीख़ को मूल दस्तावेज़ से मिलाएँ।", downloadBrief:"केस-सार डाउनलोड करें (JSON)", saveToWorkspace:"वकील समीक्षा कार्यक्षेत्र में सहेजें",
    again:"दूसरा नोटिस जाँचें", follow:"इस नोटिस के बारे में सवाल पूछें", ask:"पूछें", ph:"अपना सवाल लिखें", err:"कुछ गलत हो गया।", nofile:"कृपया कम से कम एक पन्ना जोड़ें।",
    welcomeConsent:"अपने कानूनी नोटिस को चरण-दर-चरण समझें।",
    navDashboard:"डैशबोर्ड",
    navUpload:"दस्तावेज़ अपलोड करें",
    navQueue:"समीक्षा कतार",
    navAllCases:"सभी केस",
    navMore:"अन्य",
    navReports:"रिपोर्ट",
    navResources:"कानूनी संसाधन",
    privacyTitle:"आपके दस्तावेज़ महत्वपूर्ण हैं",
    privacyNote:"संवेदनशील जानकारी साझा करने से पहले समझें कि दस्तावेज़ कैसे प्रोसेस होता है।",
    workspaceLabel:"कार्यस्थल",
    dashboardTitle:"डैशबोर्ड",
    dashboardSubtitle:"शुरू करने के लिए चुनें।",
    overviewLabel:"अवलोकन",
    dashboardHero:"अपने कानूनी नोटिस को आसानी से समझें।",
    dashboardIntro:"नया दस्तावेज़ विश्लेषण शुरू करें या वकील समीक्षा कार्यक्षेत्र में सहेजे गए मसौदे खोलें।",
    startAnalysis:"नया नोटिस जाँचें",
    uploadCardTitle:"दस्तावेज़ अपलोड करें",
    uploadCardText:"आसान भाषा में जानकारी, महत्वपूर्ण तारीखें और केस-सार का मसौदा पाएँ।",
    uploadNow:"अभी अपलोड करें →",
    queueCardTitle:"समीक्षा के बाकी केस",
    queueCardText:"सहेजे गए मसौदों की समीक्षा के लिए सुरक्षित वकील कार्यक्षेत्र खोलें।",
    openQueue:"समीक्षा कतार खोलें →",
    allCasesCardTitle:"सहेजा गया केस खोजें",
    allCasesCardText:"सहेजे गए केस खोजें और समीक्षा स्थिति के अनुसार फ़िल्टर करें।",
    openAllCases:"सभी केस देखें →",
    howTitle:"यह कैसे काम करता है",
    stepOneTitle:"अपलोड करें",
    stepOneText:"स्पष्ट PDF या पन्नों की तस्वीरें चुनें।",
    stepTwoTitle:"समझें",
    stepTwoText:"व्याख्या पढ़ें और तथ्य, तारीखें व उद्धरण जाँचें।",
    stepThreeTitle:"समीक्षा",
    stepThreeText:"मसौदा तभी सहेजें जब आपको उसे वकील समीक्षा के लिए रखने की अनुमति हो।",
    noticeBoundaryTitle:"महत्वपूर्ण",
    noticeBoundary:"यह उपकरण कानूनी जानकारी देता है, कानूनी सलाह नहीं। AI से निकले तथ्य और तारीखें मूल दस्तावेज़ से जाँचें।",
    uploadStep:"नया विश्लेषण",
    dropTitle:"नोटिस या दस्तावेज़ के पन्ने चुनें",
    dropHint:"PDF या तस्वीरें · एक PDF या अधिकतम तीन तस्वीरें",
    districtHint:"हर ज़िले के लिए स्थानीय कानूनी सहायता संपर्क उपलब्ध नहीं हो सकते।",
    analysisComplete:"विश्लेषण पूरा",
    resultsTitle:"अपना नोटिस समझें",
    resultsHint:"सारांश पढ़ें, महत्वपूर्ण तारीखें देखें और नीचे दिए प्रमाण जाँचें।",
    reportsLabel:"मूल्यांकन",
    reportsTitle:"जानकारी निकालने का मूल्यांकन",
    reportsIntro:"इस प्रोटोटाइप में अभी लाइव संचालन रिपोर्ट नहीं हैं। डेवलपर स्थानीय रूप से जाँचे गए बेंचमार्क और JSON परिणामों से मूल्यांकन करते हैं।",
    reportsBoundaryTitle:"आँकड़े गढ़े नहीं जाते",
    reportsBoundary:"प्रमाणित रिपोर्टिंग सुविधा उपलब्ध न होने के कारण यहाँ केस संख्या या सटीकता दरें नहीं दिखाई जातीं।",
    evalGuide:"मूल्यांकन गाइड खोलें ↗",
    resourcesLabel:"सहायता",
    resourcesTitle:"कानूनी सहायता संसाधन",
    resourcesIntro:"इस प्रोटोटाइप में ज़िलेवार सत्यापित कानूनी सहायता सूची अभी उपलब्ध नहीं है। नीचे दिए संपर्क से शुरुआत करें और उपलब्धता की पुष्टि करें।",
    nalsaTitle:"NALSA कानूनी सहायता हेल्पलाइन",
    nalsaText:"कानूनी सहायता की जानकारी और सही सेवा खोजने के लिए कॉल करें।",
    callNalsa:"15100 पर कॉल करें",
    lawyerTitle:"योग्य वकील से बात करें",
    lawyerText:"कार्रवाई से पहले वकील से नोटिस, लागू समय-सीमा और जवाब के विकल्पों की पुष्टि करवाएँ।",
    reportsPageSubtitle:"जानें कि बेंचमार्क से प्रोटोटाइप का परीक्षण कैसे होता है।",
    resourcesPageSubtitle:"पेशेवर कानूनी सहायता पाने के शुरुआती विकल्प।",
    uploadPageTitle:"दस्तावेज़ अपलोड करें",
    uploadPageSubtitle:"नोटिस अपलोड करके आसान भाषा में व्याख्या और समीक्षा योग्य मसौदा पाएँ।",
    queuePageTitle:"समीक्षा कतार",
    queuePageSubtitle:"ध्यान देने की आवश्यकता वाले सहेजे गए मसौदों की समीक्षा करें।",
    allCasesPageTitle:"सभी केस",
    allCasesPageSubtitle:"सहेजे गए केस और उनकी समीक्षा स्थिति देखें।",
    footer:"यह कानूनी जानकारी है, कानूनी सलाह नहीं। कृपया किसी वकील या कानूनी सहायता स्वयंसेवक से पुष्टि करें।" },
  kn: { title:"ನ್ಯಾಯ ಸಾಥಿ", tag:"ನಿಮ್ಮ ಕಾನೂನು ನೋಟಿಸ್ ಅನ್ನು ಸರಳ ಮಾತುಗಳಲ್ಲಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.", agree:"ನಾನು ಒಪ್ಪುತ್ತೇನೆ, ಮುಂದುವರಿಸಿ",
    upload:"ನಿಮ್ಮ ನೋಟಿಸ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ", hint:"ಪ್ರತಿ ಪುಟದ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆಯಿರಿ (ಗರಿಷ್ಠ 3) ಅಥವಾ PDF ಆಯ್ಕೆಮಾಡಿ.", pick:"📷 ಫೋಟೋ ತೆಗೆಯಿರಿ ಅಥವಾ ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ", rm:"ತೆಗೆಯಿರಿ",
    received:"ನೋಟಿಸ್ ಸಿಕ್ಕ ದಿನಾಂಕ (ಐಚ್ಛಿಕ)", receivedHint:"ಇದು ನಿಮ್ಮ ಗಡುವನ್ನು ಲೆಕ್ಕಹಾಕಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.", district:"ನಿಮ್ಮ ಜಿಲ್ಲೆ (ಐಚ್ಛಿಕ)", none:"ಜಿಲ್ಲೆ ಆಯ್ಕೆಮಾಡಿ",
    go:"ನನ್ನ ನೋಟಿಸ್ ವಿವರಿಸಿ", s1:"ನಿಮ್ಮ ನೋಟಿಸ್ ಓದುತ್ತಿದ್ದೇವೆ…", s2:"ಗಡುವು ಮತ್ತು ನಿಯಮಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇವೆ…", s3:"ನಿಮಗಾಗಿ ವಿವರಣೆ ಬರೆಯುತ್ತಿದ್ದೇವೆ…", wait:"ಇದಕ್ಕೆ ಸುಮಾರು 20 ಸೆಕೆಂಡ್ ಬೇಕು.",
    help:"ಇದು ಬಂಧನ, ಹಿಂಸೆ ಅಥವಾ ಮಗುವಿನ ಬಗ್ಗೆ ಇದೆಯೇ? ಈಗಲೇ ಸಹಾಯ ಪಡೆಯಿರಿ", call:"📞 NALSA 15100 ಗೆ ಕರೆ ಮಾಡಿ", urgent:"ತುರ್ತು: ಇಂದೇ ಕಾನೂನು ನೆರವನ್ನು ಸಂಪರ್ಕಿಸಿ",
    listen:"🔊 ಕೇಳಿ", stop:"⏹ ನಿಲ್ಲಿಸಿ", print:"🖨 ಪ್ರಿಂಟ್", up:"👍 ಉಪಯುಕ್ತ", down:"👎 ಉಪಯುಕ್ತವಲ್ಲ", thanks:"ನಿಮ್ಮ ಅಭಿಪ್ರಾಯಕ್ಕೆ ಧನ್ಯವಾದಗಳು.",
    briefTitle:"ವಕೀಲರಿಗಾಗಿ ಪ್ರಕರಣದ ಸಾರಾಂಶ (ಕರಡು)", briefStatus:"ಇದು ವಕೀಲರ ಪರಿಶೀಲನೆಗಾಗಿ ಇರುವ ಕರಡು. ಬಳಸುವ ಮೊದಲು ಪ್ರತಿಯೊಂದು ವಿಷಯ, ಉಲ್ಲೇಖ ಮತ್ತು ದಿನಾಂಕವನ್ನು ಮೂಲ ದಾಖಲೆಯೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ.", downloadBrief:"ಪ್ರಕರಣದ ಸಾರಾಂಶ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ (JSON)", saveToWorkspace:"ವಕೀಲರ ಪರಿಶೀಲನಾ ಕಾರ್ಯಕ್ಷೇತ್ರಕ್ಕೆ ಉಳಿಸಿ",
    again:"ಇನ್ನೊಂದು ನೋಟಿಸ್ ಪರಿಶೀಲಿಸಿ", follow:"ಈ ನೋಟಿಸ್ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಕೇಳಿ", ask:"ಕೇಳಿ", ph:"ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಬರೆಯಿರಿ", err:"ಏನೋ ತಪ್ಪಾಗಿದೆ.", nofile:"ದಯವಿಟ್ಟು ಕನಿಷ್ಠ ಒಂದು ಪುಟ ಸೇರಿಸಿ.",
    welcomeConsent:"ನಿಮ್ಮ ಕಾನೂನು ನೋಟಿಸ್ ಅನ್ನು ಹಂತ ಹಂತವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.",
    navDashboard:"ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    navUpload:"ದಾಖಲೆ ಅಪ್‌ಲೋಡ್",
    navQueue:"ಪರಿಶೀಲನಾ ಸರತಿ",
    navAllCases:"ಎಲ್ಲಾ ಪ್ರಕರಣಗಳು",
    navMore:"ಇತರೆ",
    navReports:"ವರದಿಗಳು",
    navResources:"ಕಾನೂನು ಸಂಪನ್ಮೂಲಗಳು",
    privacyTitle:"ನಿಮ್ಮ ದಾಖಲೆಗಳು ಮುಖ್ಯ",
    privacyNote:"ಸೂಕ್ಷ್ಮ ಮಾಹಿತಿಯನ್ನು ಹಂಚುವ ಮೊದಲು ದಾಖಲೆ ಹೇಗೆ ಸಂಸ್ಕರಿಸಲಾಗುತ್ತದೆ ಎಂಬುದನ್ನು ತಿಳಿಯಿರಿ.",
    workspaceLabel:"ಕಾರ್ಯಕ್ಷೇತ್ರ",
    dashboardTitle:"ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    dashboardSubtitle:"ಎಲ್ಲಿ ಪ್ರಾರಂಭಿಸಬೇಕೆಂದು ಆಯ್ಕೆಮಾಡಿ.",
    overviewLabel:"ಅವಲೋಕನ",
    dashboardHero:"ನಿಮ್ಮ ಕಾನೂನು ನೋಟಿಸ್ ಅನ್ನು ಸುಲಭವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.",
    dashboardIntro:"ಹೊಸ ದಾಖಲೆ ವಿಶ್ಲೇಷಣೆ ಆರಂಭಿಸಿ ಅಥವಾ ವಕೀಲರ ಪರಿಶೀಲನಾ ಕಾರ್ಯಕ್ಷೇತ್ರದಲ್ಲಿ ಉಳಿಸಿದ ಕರಡುಗಳನ್ನು ತೆರೆಯಿರಿ.",
    startAnalysis:"ಹೊಸ ನೋಟಿಸ್ ಪರಿಶೀಲಿಸಿ",
    uploadCardTitle:"ದಾಖಲೆ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    uploadCardText:"ಸರಳ ವಿವರಣೆ, ಮುಖ್ಯ ದಿನಾಂಕಗಳು ಮತ್ತು ಪರಿಶೀಲಿಸಬಹುದಾದ ಕರಡು ಸಾರಾಂಶ ಪಡೆಯಿರಿ.",
    uploadNow:"ಈಗ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ →",
    queueCardTitle:"ಪರಿಶೀಲಿಸಬೇಕಾದ ಪ್ರಕರಣಗಳು",
    queueCardText:"ಉಳಿಸಿದ ಕರಡುಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ಟೋಕನ್-ರಕ್ಷಿತ ವಕೀಲರ ಕಾರ್ಯಕ್ಷೇತ್ರ ತೆರೆಯಿರಿ.",
    openQueue:"ಪರಿಶೀಲನಾ ಸರತಿ ತೆರೆಯಿರಿ →",
    allCasesCardTitle:"ಉಳಿಸಿದ ಪ್ರಕರಣ ಹುಡುಕಿ",
    allCasesCardText:"ಉಳಿಸಿದ ಪ್ರಕರಣಗಳನ್ನು ಹುಡುಕಿ ಮತ್ತು ಸ್ಥಿತಿಯ ಪ್ರಕಾರ ಫಿಲ್ಟರ್ ಮಾಡಿ.",
    openAllCases:"ಎಲ್ಲಾ ಪ್ರಕರಣಗಳನ್ನು ನೋಡಿ →",
    howTitle:"ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
    stepOneTitle:"ಅಪ್‌ಲೋಡ್",
    stepOneText:"ಸ್ಪಷ್ಟ PDF ಅಥವಾ ಪುಟಗಳ ಚಿತ್ರಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    stepTwoTitle:"ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ",
    stepTwoText:"ವಿವರಣೆಯನ್ನು ಓದಿ, ಸಂಗತಿಗಳು, ದಿನಾಂಕಗಳು ಮತ್ತು ಉಲ್ಲೇಖಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
    stepThreeTitle:"ಪರಿಶೀಲನೆ",
    stepThreeText:"ವಕೀಲರ ಪರಿಶೀಲನೆಗಾಗಿ ಉಳಿಸಲು ನಿಮಗೆ ಅನುಮತಿ ಇದ್ದಾಗ ಮಾತ್ರ ಕರಡನ್ನು ಉಳಿಸಿ.",
    noticeBoundaryTitle:"ಮುಖ್ಯ",
    noticeBoundary:"ಈ ಸಾಧನ ಕಾನೂನು ಮಾಹಿತಿಯನ್ನು ನೀಡುತ್ತದೆ, ಕಾನೂನು ಸಲಹೆಯಲ್ಲ. AI ಹೊರತೆಗೆದ ಸಂಗತಿಗಳು ಮತ್ತು ದಿನಾಂಕಗಳನ್ನು ಮೂಲ ದಾಖಲೆಯೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ.",
    uploadStep:"ಹೊಸ ವಿಶ್ಲೇಷಣೆ",
    dropTitle:"ನೋಟಿಸ್ ಅಥವಾ ದಾಖಲೆ ಪುಟಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    dropHint:"PDF ಅಥವಾ ಚಿತ್ರಗಳು · ಒಂದು PDF ಅಥವಾ ಗರಿಷ್ಠ ಮೂರು ಚಿತ್ರಗಳು",
    districtHint:"ಪ್ರತಿ ಜಿಲ್ಲೆಗೆ ಸ್ಥಳೀಯ ಕಾನೂನು ನೆರವು ಸಂಪರ್ಕಗಳು ಲಭ್ಯವಿರದೇ ಇರಬಹುದು.",
    analysisComplete:"ವಿಶ್ಲೇಷಣೆ ಪೂರ್ಣಗೊಂಡಿದೆ",
    resultsTitle:"ನಿಮ್ಮ ನೋಟಿಸ್ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ",
    resultsHint:"ಸಾರಾಂಶ ಓದಿ, ಮುಖ್ಯ ದಿನಾಂಕಗಳನ್ನು ನೋಡಿ ಮತ್ತು ಕೆಳಗಿನ ಸಾಕ್ಷ್ಯವನ್ನು ಪರಿಶೀಲಿಸಿ.",
    reportsLabel:"ಮೌಲ್ಯಮಾಪನ",
    reportsTitle:"ಮಾಹಿತಿ ಹೊರತೆಗೆಯುವ ಮೌಲ್ಯಮಾಪನ",
    reportsIntro:"ಈ ಪ್ರೋಟೋಟೈಪ್‌ನಲ್ಲಿ ಇನ್ನೂ ನೇರ ಕಾರ್ಯಾಚರಣೆ ವರದಿಗಳಿಲ್ಲ. ಡೆವಲಪರ್‌ಗಳು ಪರಿಶೀಲಿತ ಬೆಂಚ್‌ಮಾರ್ಕ್ ಮತ್ತು JSON ಫಲಿತಾಂಶಗಳಿಂದ ಸ್ಥಳೀಯವಾಗಿ ಮೌಲ್ಯಮಾಪನ ಮಾಡುತ್ತಾರೆ.",
    reportsBoundaryTitle:"ಕೃತಕ ಅಂಕಿಅಂಶಗಳಿಲ್ಲ",
    reportsBoundary:"ಪ್ರಮಾಣೀಕೃತ ವರದಿ API ಇಲ್ಲದ ಕಾರಣ ಇಲ್ಲಿ ಪ್ರಕರಣಗಳ ಸಂಖ್ಯೆ ಅಥವಾ ನಿಖರತೆಯ ಪ್ರಮಾಣ ತೋರಿಸುವುದಿಲ್ಲ.",
    evalGuide:"ಮೌಲ್ಯಮಾಪನ ಮಾರ್ಗದರ್ಶಿ ತೆರೆಯಿರಿ ↗",
    resourcesLabel:"ಸಹಾಯ",
    resourcesTitle:"ಕಾನೂನು ನೆರವು ಸಂಪನ್ಮೂಲಗಳು",
    resourcesIntro:"ಈ ಪ್ರೋಟೋಟೈಪ್‌ನಲ್ಲಿ ಜಿಲ್ಲಾವಾರು ಪರಿಶೀಲಿತ ಕಾನೂನು ನೆರವು ಪಟ್ಟಿ ಇನ್ನೂ ಸಂಯೋಜಿಸಲಾಗಿಲ್ಲ. ಕೆಳಗಿನ ಸಂಪರ್ಕದಿಂದ ಪ್ರಾರಂಭಿಸಿ ಮತ್ತು ಲಭ್ಯತೆಯನ್ನು ದೃಢೀಕರಿಸಿ.",
    nalsaTitle:"NALSA ಕಾನೂನು ನೆರವು ಸಹಾಯವಾಣಿ",
    nalsaText:"ಕಾನೂನು ನೆರವಿನ ಮಾಹಿತಿ ಮತ್ತು ಸೂಕ್ತ ಸೇವೆಯನ್ನು ಹುಡುಕಲು ಕರೆ ಮಾಡಿ.",
    callNalsa:"15100 ಗೆ ಕರೆ ಮಾಡಿ",
    lawyerTitle:"ಅರ್ಹ ವಕೀಲರೊಂದಿಗೆ ಮಾತನಾಡಿ",
    lawyerText:"ಕ್ರಮ ಕೈಗೊಳ್ಳುವ ಮೊದಲು ನೋಟಿಸ್, ಅನ್ವಯವಾಗುವ ಗಡುವು ಮತ್ತು ಪ್ರತಿಕ್ರಿಯೆ ಆಯ್ಕೆಗಳನ್ನು ವೃತ್ತಿಪರರೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ.",
    reportsPageSubtitle:"ಬೆಂಚ್‌ಮಾರ್ಕ್‌ನಿಂದ ಪ್ರೋಟೋಟೈಪ್ ಪರೀಕ್ಷಿಸುವ ವಿಧಾನವನ್ನು ನೋಡಿ.",
    resourcesPageSubtitle:"ವೃತ್ತಿಪರ ಕಾನೂನು ನೆರವು ಪಡೆಯಲು ಆರಂಭಿಕ ಆಯ್ಕೆಗಳು.",
    uploadPageTitle:"ದಾಖಲೆ ಅಪ್‌ಲೋಡ್",
    uploadPageSubtitle:"ನೋಟಿಸ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಸರಳ ವಿವರಣೆ ಮತ್ತು ಪರಿಶೀಲಿಸಬಹುದಾದ ಕರಡು ಪಡೆಯಿರಿ.",
    queuePageTitle:"ಪರಿಶೀಲನಾ ಸರತಿ",
    queuePageSubtitle:"ಗಮನ ಅಗತ್ಯವಿರುವ ಉಳಿಸಿದ ಕರಡುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
    allCasesPageTitle:"ಎಲ್ಲಾ ಪ್ರಕರಣಗಳು",
    allCasesPageSubtitle:"ಉಳಿಸಿದ ಪ್ರಕರಣಗಳು ಮತ್ತು ಅವುಗಳ ಪರಿಶೀಲನಾ ಸ್ಥಿತಿಯನ್ನು ನೋಡಿ.",
    footer:"ಇದು ಕಾನೂನು ಮಾಹಿತಿ, ಕಾನೂನು ಸಲಹೆ ಅಲ್ಲ. ದಯವಿಟ್ಟು ವಕೀಲರು ಅಥವಾ ಕಾನೂನು ನೆರವು ಸ್ವಯಂಸೇವಕರಲ್ಲಿ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ." }
};
const CONSENT = {
  en: "Your notice is sent to Google Gemini for extraction; review your API plan's data terms before sharing sensitive information. We do not store the uploaded file. If you choose 'Save to lawyer review workspace', the extracted brief and review metadata are stored on this server. Redact names and addresses when possible.",
  hi: "आपका नोटिस जानकारी निकालने के लिए Google Gemini को भेजा जाता है; संवेदनशील जानकारी साझा करने से पहले अपने API प्लान की डेटा शर्तें जाँचें। ऐप अपलोड की गई फ़ाइल को स्टोर नहीं करता। यदि आप 'वकील समीक्षा कार्यक्षेत्र में सहेजें' चुनते हैं, तो निकाला गया सारांश और समीक्षा मेटाडेटा सर्वर पर सहेजे जाएंगे। संभव हो तो नाम और पते छिपाएँ।",
  kn: "ನಿಮ್ಮ ನೋಟಿಸ್‌ನ ಮಾಹಿತಿಯನ್ನು ಹೊರತೆಗೆದುಕೊಳ್ಳಲು ಅದನ್ನು Google Gemini ಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ; ಸೂಕ್ಷ್ಮ ಮಾಹಿತಿಯನ್ನು ಹಂಚುವ ಮೊದಲು ನಿಮ್ಮ API ಯೋಜನೆಯ ಡೇಟಾ ನಿಯಮಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಮೂಲ ಫೈಲ್ ಅನ್ನು ಅಪ್ಲಿಕೇಶನ್ ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ. 'ವಕೀಲರ ಪರಿಶೀಲನಾ ಕಾರ್ಯಕ್ಷೇತ್ರಕ್ಕೆ ಉಳಿಸಿ' ಆಯ್ಕೆ ಮಾಡಿದರೆ, ಹೊರತೆಗೆದ ಸಾರಾಂಶ ಮತ್ತು ಪರಿಶೀಲನಾ ಮೆಟಾಡೇಟಾ ಸರ್ವರ್‌ನಲ್ಲಿ ಉಳಿಯುತ್ತವೆ. ಸಾಧ್ಯವಾದರೆ ಹೆಸರು ಮತ್ತು ವಿಳಾಸಗಳನ್ನು ಮರೆಮಾಡಿ."
};
const GUIDE = {
  en: "If this is about domestic violence, arrest, or a child, please contact NALSA 15100 or your district DLSA.",
  hi: "यदि यह घरेलू हिंसा, गिरफ्तारी, या एक बालक के बारे में है, तो कृपया NALSA 15100 या अपने जिले के DLSA से संपर्क करें।",
  kn: "ಇದು ಗೃಹ ಹಿಂಸಾಚಾರ, ಜೈಲಿಗೆ ಹಾಕುವಿಕೆ ಅಥವಾ ಮಕ್ಕಳ ಬಗ್ಗೆ ಇದ್ದರೆ, ದಯವಿಟ್ಟು NALSA 15100 ಅಥವಾ ನಿಮ್ಮ ಜಿಲ್ಲೆ DLSA ಸಂಪರ್ಕಿಸಿ."
};
const VOICE = { en: "en-IN", hi: "hi-IN", kn: "kn-IN" };
const $ = id => document.getElementById(id);
let lang = "en", files = [], session = "", timer = null, currentBrief = null, currentView = "dashboard";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isPdf = f => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const HEADS = ["what is this","who sent it","what do they want","deadline","what happens if you ignore it","your options","documents to gather","free legal help"];

// Safe mini-markdown: escapes first, then turns headings into section cards, "- " into lists, **bold** into <b>.
function md(src) {
  let out = "", sec = false, ul = false;
  const endUl = () => { if (ul) { out += "</ul>"; ul = false; } };
  const endSec = () => { endUl(); if (sec) { out += "</section>"; sec = false; } };
  const inl = s => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  for (let L of esc(src).split("\n")) {
    L = L.trim();
    if (!L) { endUl(); continue; }
    const clean = L.replace(/[*_#⏰]/g, "").replace(/[?:]\s*$/, "").trim().toLowerCase();
    if (/^#{1,4}\s/.test(L) || HEADS.includes(clean)) {
      endSec();
      out += '<section class="sec' + (/deadline|⏰/i.test(L) ? " dl" : "") + '"><h3>' + inl(L.replace(/^#+\s*/, "").replace(/^\*\*|\*\*$/g, "")) + "</h3>";
      sec = true; continue;
    }
    const li = L.match(/^[-*•]\s+(.*)$/);
    if (li) { if (!ul) { out += "<ul>"; ul = true; } out += "<li>" + inl(li[1]) + "</li>"; }
    else { endUl(); out += "<p>" + inl(L) + "</p>"; }
  }
  endSec();
  return out;
}

function applyLang() {
  const d = I[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i]").forEach(e => { if (d[e.dataset.i] !== undefined) e.textContent = d[e.dataset.i]; });
  document.querySelectorAll("[data-i-placeholder]").forEach(e => { if (d[e.dataset.iPlaceholder] !== undefined) e.placeholder = d[e.dataset.iPlaceholder]; });
  $("consentText").textContent = CONSENT[lang];
  $("helpText").textContent = GUIDE[lang];
  $("q").placeholder = d.ph;
  $("lang").value = lang;
  if ($("pageTitle")) {
    const titleKeys = {dashboard:"dashboardTitle",upload:"uploadPageTitle",reports:"reportsTitle",resources:"resourcesTitle"};
    const subtitleKeys = {dashboard:"dashboardSubtitle",upload:"uploadPageSubtitle",reports:"reportsPageSubtitle",resources:"resourcesPageSubtitle"};
    $("pageTitle").textContent = d[titleKeys[currentView] || "dashboardTitle"];
    $("pageSubtitle").textContent = d[subtitleKeys[currentView] || "dashboardSubtitle"];
  }
  renderThumbs();
}
$("lang").onchange = e => { lang = e.target.value; applyLang(); };

function setView(view) {
  const views = ["dashboard", "upload", "reports", "resources"];
  if (!views.includes(view)) view = "dashboard";
  if (view === "upload" && currentView !== "upload" && $("out") && !$("out").hidden) {
    files = [];
    renderThumbs();
    $("rd").value = "";
    $("out").hidden = true;
    $("up").hidden = false;
    $("chat").replaceChildren();
    $("fb").hidden = true;
  }
  currentView = view;
  for (const name of views) $(name + "View").hidden = name !== view;
  document.querySelectorAll("[data-view]").forEach(el => {
    const active = el.dataset.view === view;
    el.classList.toggle("active", active && el.classList.contains("nav-item"));
    if (el.classList.contains("nav-item") && el.tagName === "BUTTON") el.setAttribute("aria-current", active ? "page" : "false");
  });
  const titleKeys = {dashboard:"dashboardTitle",upload:"uploadPageTitle",reports:"reportsTitle",resources:"resourcesTitle"};
  const subtitleKeys = {dashboard:"dashboardSubtitle",upload:"uploadPageSubtitle",reports:"reportsPageSubtitle",resources:"resourcesPageSubtitle"};
  $("pageTitle").textContent = I[lang][titleKeys[view]];
  $("pageSubtitle").textContent = I[lang][subtitleKeys[view]];
  window.scrollTo(0, 0);
}
document.querySelectorAll("[data-view]").forEach(el => el.addEventListener("click", () => {
  setView(el.dataset.view);
}));
$("startAnalysis").onclick = () => setView("upload");
$("agree").onclick = () => {
  try { sessionStorage.setItem("nyayaSaathiConsent", "accepted"); } catch (e) {}
  $("consent").hidden = true;
  $("app").hidden = false;
  const requested = new URLSearchParams(window.location.search).get("view") || "dashboard";
  setView(requested);
  loadDistricts();
};

async function loadDistricts() {
  try {
    const r = await fetch("/districts.csv");
    if (!r.ok) return;
    const seen = new Set();
    (await r.text()).trim().split("\n").slice(1).forEach(l => {
      const n = l.split(",")[0].replace(/^"|"$/g, "").trim();
      if (n && !seen.has(n)) { seen.add(n); const o = document.createElement("option"); o.value = n; o.textContent = n; $("dist").appendChild(o); }
    });
  } catch (e) {}
}

// Shrink big phone photos before upload: faster, and less likely to fail.
async function shrink(f) {
  if (!f.type.startsWith("image/") || f.type === "image/gif") return f;
  try {
    const bmp = await createImageBitmap(f);
    const s = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise(r => c.toBlob(r, "image/jpeg", 0.85));
    return b ? new File([b], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
  } catch (e) { return f; }
}
$("pick").onclick = () => $("files").click();
$("files").onchange = async e => {
  const add = [...e.target.files]; e.target.value = "";
  const pdf = add.find(isPdf);
  if (pdf) files = [pdf];
  else { files = files.filter(f => !isPdf(f)); for (const f of add) if (files.length < 3) files.push(await shrink(f)); }
  renderThumbs();
};
function renderThumbs() {
  const t = $("thumbs"); t.innerHTML = "";
  files.forEach((f, i) => {
    const w = document.createElement("div"); w.className = "th";
    if (isPdf(f)) { w.innerHTML = '<div class="pdf">PDF<br><small></small></div>'; w.querySelector("small").textContent = f.name; }
    else { const im = new Image(); im.src = URL.createObjectURL(f); im.alt = ""; w.appendChild(im); }
    const b = document.createElement("button"); b.type = "button"; b.className = "x"; b.textContent = "×";
    b.setAttribute("aria-label", I[lang].rm); b.onclick = () => { files.splice(i, 1); renderThumbs(); };
    w.appendChild(b); t.appendChild(w);
  });
}

$("helpBtn").onclick = () => { const h = $("helpBox"); h.hidden = !h.hidden; $("helpBtn").setAttribute("aria-expanded", String(!h.hidden)); };

function setLoading(on) {
  $("load").hidden = !on; $("go").disabled = on;
  clearInterval(timer);
  if (on) { let n = 0; const steps = ["s1", "s2", "s3"]; $("lstep").textContent = I[lang].s1;
    timer = setInterval(() => { n = Math.min(n + 1, 2); $("lstep").textContent = I[lang][steps[n]]; }, 4500); }
}
const showErr = m => { $("err").textContent = m; $("err").hidden = false; };

$("go").onclick = async () => {
  $("err").hidden = true;
  if (!files.length) return showErr(I[lang].nofile);
  setLoading(true);
  const fd = new FormData();
  files.forEach(f => fd.append("files", f, f.name));
  fd.append("language", lang); fd.append("received_date", $("rd").value); fd.append("district", $("dist").value);
  try {
    const r = await fetch("/analyze", { method: "POST", body: fd });
    if (!r.ok) { let m = ""; try { m = (await r.json()).detail || ""; } catch (e) {} throw new Error(String(m).slice(0, 140)); }
    show(await r.json());
  } catch (e) { showErr(I[lang].err + (e.message ? " (" + e.message + ")" : "")); }
  setLoading(false);
};

function show(d) {
  session = d.session_id;
  currentBrief = d.lawyer_brief || null;
  $("briefBox").hidden = !currentBrief;
  $("downloadBrief").disabled = !currentBrief;
  $("briefStatus").textContent = I[lang].briefStatus;
  $("urg").hidden = !d.urgent;
  $("ans").innerHTML = md(d.answer_markdown);
  $("chat").innerHTML = ""; $("fb").hidden = true;
  $("up1").disabled = $("dn1").disabled = false;
  $("up").hidden = true; $("out").hidden = false;
  window.scrollTo(0, 0); $("ans").focus();
}

$("lis").hidden = !window.speechSynthesis;
$("lis").onclick = () => {
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); $("lis").textContent = I[lang].listen; return; }
  const u = new SpeechSynthesisUtterance($("ans").innerText); u.lang = VOICE[lang]; u.rate = 0.9;
  u.onend = () => { $("lis").textContent = I[lang].listen; };
  speechSynthesis.speak(u); $("lis").textContent = I[lang].stop;
};
$("prt").onclick = () => window.print();
$("downloadBrief").onclick = () => {
  if (!currentBrief) return;
  const blob = new Blob([JSON.stringify(currentBrief, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nyaya-saathi-brief-" + String(currentBrief.brief_id || "draft") + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

$("saveToWorkspace").onclick = async () => {
  if (!currentBrief) return;
  const approved = confirm("Saving will store this extracted brief and review metadata on the server. The original upload is not stored by this workspace. Continue only if you are authorised to save this information.");
  if (!approved) return;
  const reviewerToken = prompt("Enter the server's REVIEWER_API_TOKEN. It will be sent only with this request and will not be saved by this page.");
  if (!reviewerToken) return;
  const reviewerLabel = prompt("Reviewer label (self-reported, not verified identity):", "reviewer") || "reviewer";
  const defaultTitle = String((currentBrief.document || {}).type || "legal notice").replaceAll("_"," ") + " intake";
  const title = prompt("Case title. Avoid including unnecessary personal identifiers:", defaultTitle);
  if (title === null) return;
  try {
    const response = await fetch("/review/cases", {
      method: "POST",
      headers: {"Content-Type":"application/json","X-Reviewer-Token":reviewerToken,"X-Reviewer-Label":reviewerLabel},
      body: JSON.stringify({brief:currentBrief,title})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not save to review workspace.");
    const openNow = confirm("Saved as case " + data.case_id + ". Open the lawyer review workspace now?");
    if (openNow) window.location.href = "/review?case_id=" + encodeURIComponent(data.case_id);
  } catch (error) {
    showErr(I[lang].err + (error.message ? " (" + error.message + ")" : ""));
  }
};

async function rate(v) {
  $("up1").disabled = $("dn1").disabled = true;
  try { await fetch("/feedback", { method: "POST", body: new URLSearchParams({ session_id: session, rating: v }) }); } catch (e) {}
  $("fb").hidden = false;
}
$("up1").onclick = () => rate(1); $("dn1").onclick = () => rate(-1);

function bubble(cls, html) {
  const b = document.createElement("div"); b.className = "bub " + cls; b.innerHTML = html;
  $("chat").appendChild(b); b.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
async function ask() {
  const q = $("q").value.trim(); if (!q) return;
  bubble("me", esc(q)); $("q").value = ""; $("qs").disabled = $("q").disabled = true;
  try {
    const r = await fetch("/chat", { method: "POST", body: new URLSearchParams({ session_id: session, message: q }) });
    if (!r.ok) throw new Error();
    bubble("bot", md((await r.json()).answer_markdown));
  } catch (e) { bubble("bot", esc(I[lang].err)); }
  $("qs").disabled = $("q").disabled = false; $("q").focus();
}
$("qs").onclick = ask;
$("q").onkeydown = e => { if (e.key === "Enter") ask(); };

$("again").onclick = () => {
  if (window.speechSynthesis) speechSynthesis.cancel();
  files = []; renderThumbs(); $("rd").value = ""; $("out").hidden = true; $("up").hidden = false; setView("upload");
};

applyLang();
try {
  if (sessionStorage.getItem("nyayaSaathiConsent") === "accepted") {
    $("consent").hidden = true;
    $("app").hidden = false;
    const requested = new URLSearchParams(window.location.search).get("view") || "dashboard";
    setView(requested);
    loadDistricts();
  }
} catch (e) {}
