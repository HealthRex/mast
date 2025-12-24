"use client";

export function StudyAuthorsCard() {
  return (
    <section className="mt-4 rounded-2xl bg-[#f4f4f5] px-6 py-6 text-[14px] leading-[1.65] text-neutral-700 md:px-8">
      <div className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#0c0d10]">
          Study Authors
        </h2>
        <p>
          David Wu (<a href="mailto:dwu@mgh.harvard.edu" className="text-brand-600 hover:text-brand-700">dwu@mgh.harvard.edu</a>), Fateme Nateghi Haredasht, Saloni Kumar Maharaj, Priyank Jain, Jessica Tran, Matthew
          Gwiazdon, Arjun Rustagi, Jenelle Jindal, Jacob M. Koshy, Vinay Kadiyala, Anup Agarwal, Bassman
          Tappuni, Brianna French, Sirus Jesudasen, Christopher V. Cosgriff, Rebanta Chakraborty, Jillian
          Caldwell, Susan Ziolkowski, David J. Iberri, Robert Diep, Rahul S. Dalal, Kira L. Newman, Kristin
          Galetta, J. Carl Pallais, Nancy Wei, Kathleen M. Buchheit, David I. Hong, Ernest Y. Lee, Allen Shih,
          Vartan Pahalyants, Tamara B. Kaplan, Vishnu Ravi, Sarita Khemani, April S. Liang, Daniel Shirvani,
          Advait Patil, Nicholas Marshall, Kanav Chopra, Joel Koh, Adi Badhwar, Liam G. McCoy, David J. H.
          Wu, Yingjie Weng, Sumant Ranji, Kevin Schulman, Nigam H. Shah, Jason Hom, Arnold Milstein, Adam
          Rodman, Jonathan H. Chen, Ethan Goh
        </p>
      </div>
    </section>
  );
}
